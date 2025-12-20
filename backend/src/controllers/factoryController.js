const prisma = require('../prismaClient');

/**
 * 获取工厂列表（包含关联的产线）
 */
exports.getFactories = async (req, res) => {
  try {
    const factories = await prisma.factory.findMany({
      include: {
        productionLines: {
          orderBy: {
            id: 'asc'
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    res.json({
      status: 'ok',
      message: 'Factories fetched successfully',
      data: factories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch factories',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 获取单个工厂详情
 */
exports.getFactoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const factory = await prisma.factory.findUnique({
      where: { id: parseInt(id) },
      include: {
        productionLines: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!factory) {
      return res.status(404).json({
        status: 'error',
        message: 'Factory not found',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      message: 'Factory fetched successfully',
      data: factory,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch factory',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 创建工厂
 */
exports.createFactory = async (req, res) => {
  try {
    const { code, name, location, description, status } = req.body;

    // 参数验证
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Factory name is required',
        timestamp: new Date().toISOString()
      });
    }

    // 验证状态值（0: 可占用, 1: 不可用, 2: 已占用）
    if (status !== undefined) {
      const statusInt = parseInt(status);
      if (![0, 1, 2].includes(statusInt)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be one of: 0 (可占用), 1 (不可用), 2 (已占用)',
          timestamp: new Date().toISOString()
        });
      }
    }

    const factory = await prisma.factory.create({
      data: {
        code,
        name,
        location,
        description,
        status: status !== undefined ? parseInt(status) : 0 // 默认为0(可占用)
      },
      include: {
        productionLines: true
      }
    });

    res.status(201).json({
      status: 'ok',
      message: 'Factory created successfully',
      data: factory,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create factory',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 更新工厂信息
 */
exports.updateFactory = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, location, description, status } = req.body;

    // 验证状态值（0: 可占用, 1: 不可用, 2: 已占用）
    if (status !== undefined) {
      const statusInt = parseInt(status);
      if (![0, 1, 2].includes(statusInt)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be one of: 0 (可占用), 1 (不可用), 2 (已占用)',
          timestamp: new Date().toISOString()
        });
      }
    }

    const updateData = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = parseInt(status);

    const factory = await prisma.factory.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        productionLines: true
      }
    });

    res.json({
      status: 'ok',
      message: 'Factory updated successfully',
      data: factory,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Factory not found',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to update factory',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 删除工厂（级联删除产线）
 */
exports.deleteFactory = async (req, res) => {
  try {
    const { id } = req.params;

    const factory = await prisma.factory.delete({
      where: { id: parseInt(id) },
      include: {
        productionLines: true
      }
    });

    res.json({
      status: 'ok',
      message: 'Factory deleted successfully',
      data: {
        deletedFactory: factory,
        deletedProductionLinesCount: factory.productionLines.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Factory not found',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete factory',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 创建产线（为指定工厂添加）
 */
exports.createProductionLine = async (req, res) => {
  try {
    const { factoryId, code, name, type, capacity, status } = req.body;

    // 参数验证
    if (!factoryId || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'factoryId and name are required',
        timestamp: new Date().toISOString()
      });
    }

    // 验证工厂是否存在
    const factory = await prisma.factory.findUnique({
      where: { id: parseInt(factoryId) }
    });

    if (!factory) {
      return res.status(404).json({
        status: 'error',
        message: 'Factory not found',
        timestamp: new Date().toISOString()
      });
    }

    const productionLine = await prisma.productionLine.create({
      data: {
        code,
        name,
        type,
        capacity: capacity ? parseInt(capacity) : 100,
        status: status !== undefined ? parseInt(status) : 0, // 默认为0(可用)
        factoryId: parseInt(factoryId)
      },
      include: {
        factory: true
      }
    });

    res.status(201).json({
      status: 'ok',
      message: 'Production line created successfully',
      data: productionLine,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create production line',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 更新产线信息
 */
exports.updateProductionLine = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, capacity, status } = req.body;

    // 验证状态值（全局三态标准：0=可占用, 1=不可用, 2=已占用）
    if (status !== undefined) {
      const statusInt = parseInt(status);
      if (![0, 1, 2].includes(statusInt)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be one of: 0 (可占用), 1 (不可用), 2 (已占用)',
          timestamp: new Date().toISOString()
        });
      }
    }

    const updateData = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (status !== undefined) updateData.status = parseInt(status);

    const productionLine = await prisma.productionLine.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        factory: true
      }
    });

    res.json({
      status: 'ok',
      message: 'Production line updated successfully',
      data: productionLine,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Production line not found',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to update production line',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 删除产线
 */
exports.deleteProductionLine = async (req, res) => {
  try {
    const { id } = req.params;

    const productionLine = await prisma.productionLine.delete({
      where: { id: parseInt(id) },
      include: {
        factory: true
      }
    });

    res.json({
      status: 'ok',
      message: 'Production line deleted successfully',
      data: productionLine,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Production line not found',
        timestamp: new Date().toISOString()
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete production line',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

