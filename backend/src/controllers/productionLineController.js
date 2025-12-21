const prisma = require('../prismaClient');

/**
 * 获取所有产线列表（扁平化，带工厂信息）
 */
exports.getAllLines = async (req, res) => {
  try {
    const { current = 1, pageSize = 10, code, name, status, type } = req.query;
    const currentPage = parseInt(current);
    const size = parseInt(pageSize);
    const skip = (currentPage - 1) * size;

    const whereClause = {};
    if (code) whereClause.code = { contains: code };
    if (name) whereClause.name = { contains: name };
    if (status !== undefined) whereClause.status = parseInt(status);
    if (type) whereClause.type = { contains: type };

    const [lines, total] = await Promise.all([
      prisma.productionLine.findMany({
        where: whereClause,
        include: {
          factory: {
            select: { name: true }
          }
        },
        skip,
        take: size,
        orderBy: { id: 'asc' }
      }),
      prisma.productionLine.count({ where: whereClause })
    ]);

    res.json({
      status: 'ok',
      message: 'All lines fetched successfully',
      data: {
        list: lines,
        total,
        current: currentPage,
        pageSize: size
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[getAllLines] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch lines',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 获取产线关联资源 (设备和班组)
 */
exports.getLineResources = async (req, res) => {
  try {
    const { id } = req.params;

    const productionLine = await prisma.productionLine.findUnique({
      where: { id: parseInt(id) },
      include: {
        devices: true,
        teams: {
          include: {
            leader: true,
            staffs: true // 补全：包含成员以计算人数
          }
        }
      }
    });

    if (!productionLine) {
      return res.status(404).json({
        status: 'error',
        message: 'Production line not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      message: 'Production line resources fetched successfully',
      data: {
        devices: productionLine.devices,
        teams: productionLine.teams
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[getLineResources] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch production line resources',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 绑定设备到产线
 */
exports.bindDevices = async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceIds } = req.body; // Array of device IDs

    if (!deviceIds || !Array.isArray(deviceIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'deviceIds must be an array',
        timestamp: new Date().toISOString()
      });
    }

    // 使用事务确保一致性
    await prisma.$transaction(
      deviceIds.map(deviceId => 
        prisma.device.update({
          where: { id: parseInt(deviceId) },
          data: { 
            productionLineId: parseInt(id),
            status: 2 // 自动变为已占用
          }
        })
      )
    );

    res.json({
      status: 'ok',
      message: 'Devices bound to production line successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[bindDevices] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to bind devices',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 从产线解绑设备
 */
exports.unbindDevice = async (req, res) => {
  try {
    const { id } = req.params; // Production line ID (optional but provided in path)
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        status: 'error',
        message: 'deviceId is required',
        timestamp: new Date().toISOString()
      });
    }

    await prisma.device.update({
      where: { id: parseInt(deviceId) },
      data: { 
        productionLineId: null,
        status: 0 // 自动变为可占用
      }
    });

    res.json({
      status: 'ok',
      message: 'Device unbound from production line successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[unbindDevice] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unbind device',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 从产线解绑班组
 * 并重置班组状态为可占用 (0)
 */
exports.unbindTeam = async (req, res) => {
  try {
    const { id } = req.params; // Production line ID
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        status: 'error',
        message: 'teamId is required',
        timestamp: new Date().toISOString()
      });
    }

    await prisma.team.update({
      where: { id: parseInt(teamId) },
      data: { 
        productionLineId: null,
        status: 0 // 重置为可占用
      }
    });

    res.json({
      status: 'ok',
      message: 'Team unbound and status reset to available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[unbindTeam] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unbind team',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 绑定班组到产线
 * 并将班组状态设为已占用 (2)
 */
exports.bindTeams = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamIds } = req.body; // Array of team IDs

    if (!teamIds || !Array.isArray(teamIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'teamIds must be an array',
        timestamp: new Date().toISOString()
      });
    }

    // 使用事务确保一致性
    await prisma.$transaction(
      teamIds.map(teamId => 
        prisma.team.update({
          where: { id: parseInt(teamId) },
          data: { 
            productionLineId: parseInt(id),
            status: 2 // 自动变为已占用
          }
        })
      )
    );

    res.json({
      status: 'ok',
      message: 'Teams bound to production line successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[bindTeams] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to bind teams',
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

