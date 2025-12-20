const prisma = require('../prismaClient');

/**
 * 获取所有产线列表（扁平化，带工厂信息）
 */
exports.getAllLines = async (req, res) => {
  try {
    const lines = await prisma.productionLine.findMany({
      include: {
        factory: {
          select: { name: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    res.json({
      status: 'ok',
      message: 'All lines fetched successfully',
      data: lines,
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
          data: { productionLineId: parseInt(id) }
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
      data: { productionLineId: null }
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

