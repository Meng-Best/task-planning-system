const prisma = require('../prismaClient');

/**
 * 获取人员列表（支持分页、工号/姓名搜索、专业/职级/状态筛选）
 */
exports.getStaffs = async (req, res) => {
  try {
    const { current = 1, pageSize = 10, staffId, name, major, level, status } = req.query;

    const currentPage = parseInt(current);
    const size = parseInt(pageSize);
    const skip = (currentPage - 1) * size;

    // 构建筛选条件
    const whereClause = {};
    if (staffId) whereClause.staffId = { contains: staffId };
    if (name) whereClause.name = { contains: name };
    if (major !== undefined) whereClause.major = parseInt(major);
    if (level !== undefined) whereClause.level = parseInt(level);
    if (status !== undefined) whereClause.status = parseInt(status);

    // 并行查询数据和总数
    const [staffs, total, availableCount, unavailableCount, occupiedCount] = await Promise.all([
      prisma.staff.findMany({
        where: whereClause,
        skip: skip,
        take: size,
        orderBy: {
          id: 'asc'
        }
      }),
      prisma.staff.count({
        where: whereClause
      }),
      prisma.staff.count({
        where: { ...whereClause, status: 0 } // 可占用
      }),
      prisma.staff.count({
        where: { ...whereClause, status: 1 } // 不可用
      }),
      prisma.staff.count({
        where: { ...whereClause, status: 2 } // 已占用
      })
    ]);

    res.json({
      status: 'ok',
      message: '人员列表获取成功',
      data: {
        list: staffs,
        total: total,
        availableCount,
        unavailableCount,
        occupiedCount,
        current: currentPage,
        pageSize: size
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [getStaffs]:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 创建人员
 */
exports.createStaff = async (req, res) => {
  try {
    const { staffId, name, major, level, status } = req.body;

    // 参数验证
    if (!staffId || !name || major === undefined || level === undefined) {
      return res.status(400).json({
        status: 'error',
        message: '工号、姓名、专业和职级为必填项',
        timestamp: new Date().toISOString()
      });
    }

    const staff = await prisma.staff.create({
      data: {
        staffId,
        name,
        major: parseInt(major),
        level: parseInt(level),
        status: status !== undefined ? parseInt(status) : 0
      }
    });

    res.status(201).json({
      status: 'ok',
      message: '人员创建成功',
      data: staff,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [createStaff]:', error);
    
    // 处理唯一性约束冲突 (工号重复)
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: `工号 '${req.body.staffId}' 已存在`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 更新人员信息
 */
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId, name, major, level, status } = req.body;
    const idInt = parseInt(id);

    // 如果要更新状态，先检查该人员是否已加入班组
    if (status !== undefined) {
      const currentStaff = await prisma.staff.findUnique({
        where: { id: idInt },
        select: { teamId: true, team: { select: { name: true } } }
      });

      if (currentStaff && currentStaff.teamId) {
        return res.status(400).json({
          status: 'error',
          message: `无法直接修改状态：该人员当前属于班组 [${currentStaff.team.name}]。请先在班组管理中将其移出班组后再修改状态。`,
          timestamp: new Date().toISOString()
        });
      }
    }

    const updateData = {};
    if (staffId !== undefined) updateData.staffId = staffId;
    if (name !== undefined) updateData.name = name;
    if (major !== undefined) updateData.major = parseInt(major);
    if (level !== undefined) updateData.level = parseInt(level);
    if (status !== undefined) updateData.status = parseInt(status);

    const staff = await prisma.staff.update({
      where: { id: idInt },
      data: updateData
    });

    res.json({
      status: 'ok',
      message: '人员信息更新成功',
      data: staff,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [updateStaff]:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: '人员不存在',
        timestamp: new Date().toISOString()
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: `工号 '${req.body.staffId}' 已存在`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 删除人员
 */
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.staff.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'ok',
      message: '人员已删除',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [deleteStaff]:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: '人员不存在',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

