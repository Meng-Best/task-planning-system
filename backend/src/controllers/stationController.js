const prisma = require('../prismaClient');

// 获取所有工位（带分页和过滤）
exports.getStations = async (req, res) => {
  try {
    const { page = 1, limit = 10, name, code, status, productionLineId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (name) where.name = { contains: name };
    if (code) where.code = { contains: code };
    if (status !== undefined && status !== '') where.status = parseInt(status);
    if (productionLineId) where.productionLineId = parseInt(productionLineId);

    const [list, total, availableCount, unavailableCount, occupiedCount] = await Promise.all([
      prisma.station.findMany({
        where,
        skip,
        take,
        include: {
          productionLine: {
            select: { id: true, name: true, code: true }
          },
          _count: {
            select: {
              devices: true,
              teams: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.station.count({ where: { ...where, status: undefined } }), // 总数忽略状态过滤？不，通常总数是过滤后的。
      // 但统计看板通常是全局总数。
      prisma.station.count({ where: { status: 0 } }),
      prisma.station.count({ where: { status: 1 } }),
      prisma.station.count({ where: { status: 2 } })
    ]);

    // 重新获取真正的过滤后总数
    const filteredTotal = await prisma.station.count({ where });

    res.json({
      status: 'ok',
      data: { 
        list, 
        total: filteredTotal, 
        availableCount, 
        unavailableCount, 
        occupiedCount,
        allTotal: await prisma.station.count(),
        page: parseInt(page), 
        limit: parseInt(limit) 
      }
    });
  } catch (error) {
    console.error('Get Stations Error:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

// 获取工位关联资源 (设备和班组)
exports.getStationResources = async (req, res) => {
  try {
    const { id } = req.params;

    const station = await prisma.station.findUnique({
      where: { id: parseInt(id) },
      include: {
        devices: true,
        teams: {
          include: { 
            leader: true,
            staffs: true
          }
        }
      }
    });

    if (!station) {
      return res.status(404).json({
        status: 'error',
        message: '工位未找到',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      message: 'Station resources fetched successfully',
      data: {
        devices: station.devices,
        teams: station.teams
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[getStationResources] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: '获取工位资源失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// 绑定设备到工位
exports.bindDevices = async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceIds } = req.body;

    if (!deviceIds || !Array.isArray(deviceIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'deviceIds 必须是数组',
        timestamp: new Date().toISOString()
      });
    }

    await prisma.$transaction(
      deviceIds.map(deviceId => 
        prisma.device.update({
          where: { id: parseInt(deviceId) },
          data: { 
            stationId: parseInt(id),
            status: 2 // 已占用
          }
        })
      )
    );

    res.json({
      status: 'ok',
      message: '设备已成功绑定到工位',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[bindDevices] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: '绑定设备失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// 从工位解绑设备
exports.unbindDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        status: 'error',
        message: 'deviceId 必填',
        timestamp: new Date().toISOString()
      });
    }

    await prisma.device.update({
      where: { id: parseInt(deviceId) },
      data: { 
        stationId: null,
        status: 0 // 可占用
      }
    });

    res.json({
      status: 'ok',
      message: '设备已从工位解绑',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[unbindDevice] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: '解绑设备失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// 绑定班组到工位
exports.bindTeams = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamIds } = req.body;

    if (!teamIds || !Array.isArray(teamIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'teamIds 必须是数组',
        timestamp: new Date().toISOString()
      });
    }

    await prisma.$transaction(
      teamIds.map(teamId => 
        prisma.team.update({
          where: { id: parseInt(teamId) },
          data: { 
            stationId: parseInt(id),
            status: 2 // 已占用
          }
        })
      )
    );

    res.json({
      status: 'ok',
      message: '班组已成功绑定到工位',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[bindTeams] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: '绑定班组失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// 从工位解绑班组
exports.unbindTeam = async (req, res) => {
  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({
        status: 'error',
        message: 'teamId 必填',
        timestamp: new Date().toISOString()
      });
    }

    await prisma.team.update({
      where: { id: parseInt(teamId) },
      data: { 
        stationId: null,
        status: 0 // 可占用
      }
    });

    res.json({
      status: 'ok',
      message: '班组已从工位解绑',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[unbindTeam] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: '解绑班组失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// 获取单个工位详情
exports.getStationById = async (req, res) => {
  try {
    const { id } = req.params;
    const station = await prisma.station.findUnique({
      where: { id: parseInt(id) },
      include: {
        productionLine: true
      }
    });

    if (!station) {
      return res.status(404).json({ status: 'error', message: '工位不存在' });
    }

    res.json({ status: 'ok', data: station });
  } catch (error) {
    console.error('Get Station Error:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

// 创建工位
exports.createStation = async (req, res) => {
  try {
    const { code, name, type, description, status, productionLineId } = req.body;

    // 检查编号是否已存在
    const existing = await prisma.station.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ status: 'error', message: '工位编号已存在' });
    }

    const station = await prisma.station.create({
      data: {
        code,
        name,
        type,
        description,
        status: status !== undefined ? parseInt(status) : 0,
        productionLineId: productionLineId ? parseInt(productionLineId) : null
      }
    });

    res.json({ status: 'ok', data: station });
  } catch (error) {
    console.error('Create Station Error:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

// 更新工位
exports.updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, description, status, productionLineId } = req.body;

    // 检查工位是否存在
    const existingStation = await prisma.station.findUnique({ where: { id: parseInt(id) } });
    if (!existingStation) {
      return res.status(404).json({ status: 'error', message: '工位不存在' });
    }

    // 如果修改了 code，检查是否与其他工位冲突
    if (code && code !== existingStation.code) {
      const conflict = await prisma.station.findUnique({ where: { code } });
      if (conflict) {
        return res.status(400).json({ status: 'error', message: '工位编号已存在' });
      }
    }

    const station = await prisma.station.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        type,
        description,
        status: status !== undefined ? parseInt(status) : existingStation.status,
        productionLineId: productionLineId !== undefined ? (productionLineId ? parseInt(productionLineId) : null) : existingStation.productionLineId
      }
    });

    res.json({ status: 'ok', data: station });
  } catch (error) {
    console.error('Update Station Error:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

// 删除工位
exports.deleteStation = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.station.delete({ where: { id: parseInt(id) } });
    res.json({ status: 'ok', message: '删除成功' });
  } catch (error) {
    console.error('Delete Station Error:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

