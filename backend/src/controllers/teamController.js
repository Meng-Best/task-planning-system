const prisma = require('../prismaClient');

/**
 * 获取班组列表
 */
exports.getTeams = async (req, res) => {
  try {
    const { current = 1, pageSize = 10, code, name, shiftType } = req.query;
    const currentPage = parseInt(current);
    const size = parseInt(pageSize);
    const skip = (currentPage - 1) * size;

    const whereClause = {};
    if (code) whereClause.code = { contains: code };
    if (name) whereClause.name = { contains: name };
    if (shiftType !== undefined && shiftType !== '') whereClause.shiftType = parseInt(shiftType);

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where: whereClause,
        include: {
          leader: {
            select: { name: true }
          },
          station: {
            include: {
              productionLine: {
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
    const { code, name, leaderId, stationId, shiftType, memberIds = [] } = req.body;

    if (!code || !name) {
      return res.status(400).json({ status: 'error', message: '编号和名称为必填项' });
    }

    const team = await prisma.$transaction(async (tx) => {
      // 1. 创建班组
      const newTeam = await tx.team.create({
        data: {
          code,
          name,
          leaderId: leaderId ? parseInt(leaderId) : null,
          stationId: stationId ? parseInt(stationId) : null,
          shiftType: shiftType !== undefined ? parseInt(shiftType) : 0
        }
      });

      // 2. 更新成员的 teamId
      if (memberIds.length > 0) {
        await tx.staff.updateMany({
          where: { id: { in: memberIds.map(id => parseInt(id)) } },
          data: {
            teamId: newTeam.id
            // 不再自动修改状态
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
    const { code, name, leaderId, stationId, shiftType, memberIds = [] } = req.body;
    const teamId = parseInt(id);

    const team = await prisma.$transaction(async (tx) => {
      // 查询更新前的班组状态
      const oldTeam = await tx.team.findUnique({
        where: { id: teamId },
        include: { station: true }
      });

      if (!oldTeam) {
        throw new Error('NOT_FOUND');
      }

      const targetStationId = stationId !== undefined ? (stationId ? parseInt(stationId) : null) : oldTeam.stationId;

      // 1. 更新班组基本信息
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          code,
          name,
          leaderId: leaderId ? parseInt(leaderId) : null,
          stationId: targetStationId,
          shiftType: shiftType !== undefined ? parseInt(shiftType) : 0
        }
      });

      // 2. 将原成员的 teamId 设为 null，并恢复状态为"可用 (0)"
      await tx.staff.updateMany({
        where: { teamId: teamId },
        data: {
          teamId: null,
          status: 0 // 恢复为可用
        }
      });

      // 3. 将新成员的 teamId 设为当前班组 ID
      if (memberIds.length > 0) {
        await tx.staff.updateMany({
          where: { id: { in: memberIds.map(mid => parseInt(mid)) } },
          data: {
            teamId: teamId
            // 不再自动修改状态
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
      // 1. 先将该班组成员的 teamId 置空，并恢复状态为"可用 (0)"
      await tx.staff.updateMany({
        where: { teamId: teamId },
        data: { 
          teamId: null,
          status: 0 // 恢复为可用
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

