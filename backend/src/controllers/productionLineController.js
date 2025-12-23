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
 * 获取产线关联资源 (工位)
 */
exports.getLineResources = async (req, res) => {
  try {
    const { id } = req.params;

    const productionLine = await prisma.productionLine.findUnique({
      where: { id: parseInt(id) },
      include: {
        stations: {
          include: {
            _count: {
              select: {
                devices: true,
                teams: true
              }
            }
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
        stations: productionLine.stations
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[getLineResources] Error:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch production line resources',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 绑定工位到产线
 */
exports.bindStations = async (req, res) => {
  try {
    const { id } = req.params; // productionLineId
    const { stationIds } = req.body;

    if (!stationIds || !Array.isArray(stationIds)) {
      return res.status(400).json({ status: 'error', message: 'stationIds 必须是数组' });
    }

    await prisma.$transaction(
      stationIds.map(stationId =>
        prisma.station.update({
          where: { id: parseInt(stationId) },
          data: { productionLineId: parseInt(id) }
        })
      )
    );

    res.json({ status: 'ok', message: '工位绑定成功' });
  } catch (error) {
    console.error('Bind Stations to Line Error:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

/**
 * 从产线解绑工位
 */
exports.unbindStation = async (req, res) => {
  try {
    const { stationId } = req.body;

    if (!stationId) {
      return res.status(400).json({ status: 'error', message: 'stationId 是必填项' });
    }

    await prisma.station.update({
      where: { id: parseInt(stationId) },
      data: { productionLineId: null }
    });

    res.json({ status: 'ok', message: '工位已解绑' });
  } catch (error) {
    console.error('Unbind Station from Line Error:', error);
    res.status(500).json({ status: 'error', message: '服务器内部错误' });
  }
};

