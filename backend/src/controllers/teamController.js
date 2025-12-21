const prisma = require('../prismaClient');

/**
 * 获取班组列表
 */
exports.getTeams = async (req, res) => {
  try {
    const { current = 1, pageSize = 10, code, name, status } = req.query;
    const currentPage = parseInt(current);
    const size = parseInt(pageSize);
    const skip = (currentPage - 1) * size;

    const whereClause = {};
    if (code) whereClause.code = { contains: code };
    if (name) whereClause.name = { contains: name };
    if (status !== undefined) whereClause.status = parseInt(status);

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where: whereClause,
        include: {
          leader: {
            select: { name: true }
          },
          productionLine: {
            include: {
              factory: {
                select: { name: true }
              }
            }
          },
          staffs: {
            select: {
              id: true,
              staffId: true,
              name: true,
              major: true,
              level: true
            }
          },
          _count: {
            select: { staffs: true }
          }
        },
        skip,
        take: size,
        orderBy: { id: 'asc' }
      }),
      prisma.team.count({ where: whereClause })
    ]);

    res.json({
      status: 'ok',
      message: '班组列表获取成功',
      data: {
        list: teams,
        total,
        current: currentPage,
        pageSize: size
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [getTeams]:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 获取可用的备选人员（未归属且非不可用状态）
 */
exports.getAvailableStaff = async (req, res) => {
  try {
    const { excludeTeamId } = req.query;
    
    const staffs = await prisma.staff.findMany({
      where: {
        status: { not: 1 }, // 非不可用
        OR: [
          { teamId: null }, // 无归属
          excludeTeamId ? { teamId: parseInt(excludeTeamId) } : {} // 或者是当前班组自己的成员（编辑时用）
        ]
      },
      select: {
        id: true,
        staffId: true,
        name: true,
        major: true,
        level: true
      }
    });

    res.json({
      status: 'ok',
      data: staffs
    });
  } catch (error) {
    console.error('SERVER ERROR [getAvailableStaff]:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误'
    });
  }
};

/**
 * 创建班组
 */
exports.createTeam = async (req, res) => {
  try {
    const { code, name, leaderId, productionLineId, status, shiftType, memberIds = [] } = req.body;

    if (!code || !name) {
      return res.status(400).json({ status: 'error', message: '编号和名称为必填项' });
    }

    const team = await prisma.$transaction(async (tx) => {
      // 核心业务逻辑：只要选择了产线，状态强制设为“已占用 (2)”
      let finalStatus = status !== undefined ? parseInt(status) : 0;
      if (productionLineId) {
        finalStatus = 2; // 已占用
      }

      // 1. 创建班组
      const newTeam = await tx.team.create({
        data: {
          code,
          name,
          leaderId: leaderId ? parseInt(leaderId) : null,
          productionLineId: productionLineId ? parseInt(productionLineId) : null,
          status: finalStatus,
          shiftType: shiftType !== undefined ? parseInt(shiftType) : 0
        }
      });

      // 2. 更新成员的 teamId 和状态
      if (memberIds.length > 0) {
        await tx.staff.updateMany({
          where: { id: { in: memberIds.map(id => parseInt(id)) } },
          data: { 
            teamId: newTeam.id,
            status: 2 // 自动变为“已占用”
          }
        });
      }

      return newTeam;
    });

    res.status(201).json({
      status: 'ok',
      message: '班组创建成功',
      data: team
    });
  } catch (error) {
    console.error('SERVER ERROR [createTeam]:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: '班组编号或班组长已存在（人员互斥）' });
    }
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

/**
 * 更新班组
 */
exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, leaderId, productionLineId, status, shiftType, memberIds = [], forceUnbind } = req.body;
    const teamId = parseInt(id);

    const team = await prisma.$transaction(async (tx) => {
      // 查询更新前的班组状态
      const oldTeam = await tx.team.findUnique({
        where: { id: teamId },
        include: { productionLine: true }
      });

      if (!oldTeam) {
        throw new Error('NOT_FOUND');
      }

      let targetStatus = status !== undefined ? parseInt(status) : oldTeam.status;
      let targetLineId = productionLineId !== undefined ? (productionLineId ? parseInt(productionLineId) : null) : oldTeam.productionLineId;

      // 核心业务逻辑：
      // A. 只要最终有产线绑定，状态就强制设为“已占用 (2)”
      if (targetLineId) {
        targetStatus = 2;
      }

      // B. 如果最终没有产线绑定，且原本有绑定，状态自动恢复为“可占用 (0)”
      if (!targetLineId && oldTeam.productionLineId) {
        targetStatus = 0;
      }

      // C. 手动保护：如果班组“手动修改状态为 0”但“产线未移除”，则需要询问
      // (由于上面的逻辑 A 已经把有产线的情况强制设为 2 了，这里的逻辑主要针对
      // 用户尝试在有产线的情况下手动保存状态为 0 的意图)
      if (status !== undefined && parseInt(status) === 0 && targetLineId) {
        if (!forceUnbind) {
          const error = new Error('UNBIND_CONFIRM_REQUIRED');
          error.lineName = oldTeam.productionLine?.name || '当前产线';
          throw error;
        }
        // 如果确认强制解绑
        targetLineId = null;
        targetStatus = 0;
      }

      // 1. 更新班组基本信息
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          code,
          name,
          leaderId: leaderId ? parseInt(leaderId) : null,
          productionLineId: targetLineId,
          status: targetStatus,
          shiftType: shiftType !== undefined ? parseInt(shiftType) : 0
        }
      });

      // 2. 将原成员的 teamId 设为 null，并恢复状态为“可占用 (0)”
      await tx.staff.updateMany({
        where: { teamId: teamId },
        data: { 
          teamId: null,
          status: 0 // 恢复为可占用
        }
      });

      // 3. 将新成员的 teamId 设为当前班组 ID，并更新状态为“已占用 (2)”
      if (memberIds.length > 0) {
        await tx.staff.updateMany({
          where: { id: { in: memberIds.map(mid => parseInt(mid)) } },
          data: { 
            teamId: teamId,
            status: 2 // 自动变为已占用
          }
        });
      }

      return updatedTeam;
    });

    res.json({
      status: 'ok',
      message: '班组更新成功',
      data: team
    });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ status: 'error', message: '班组不存在' });
    }
    if (error.message === 'UNBIND_CONFIRM_REQUIRED') {
      return res.status(400).json({
        status: 'confirm_required',
        message: `该班组当前正绑定在产组 [${error.lineName}] 上。若要将其状态改为“可占用”，必须先从产线移除。是否确认移除并修改状态？`,
      });
    }
    console.error('SERVER ERROR [updateTeam]:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: '更新冲突：编号重复或班组长已被分配' });
    }
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

/**
 * 删除班组
 */
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      // 1. 先将该班组成员的 teamId 置空，并恢复状态为“可占用 (0)”
      await tx.staff.updateMany({
        where: { teamId: teamId },
        data: { 
          teamId: null,
          status: 0 // 恢复为可占用
        }
      });

      // 2. 删除班组
      await tx.team.delete({
        where: { id: teamId }
      });
    });

    res.json({
      status: 'ok',
      message: '班组已删除'
    });
  } catch (error) {
    console.error('SERVER ERROR [deleteTeam]:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

