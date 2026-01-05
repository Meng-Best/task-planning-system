const prisma = require('../prismaClient');

/**
 * 获取设备列表（支持分页、类型和状态筛选）
 */
exports.getDevices = async (req, res) => {
  try {
    const { code, name, type, status, current = 1, pageSize = 10 } = req.query;

    // 构建筛选条件
    const whereClause = {};
    if (code) whereClause.code = { contains: code };
    if (name) whereClause.name = { contains: name };
    
    if (type !== undefined && type !== '') {
      const t = parseInt(type);
      if (!isNaN(t)) whereClause.type = t;
    }
    
    if (status !== undefined && status !== '') {
      const s = parseInt(status);
      if (!isNaN(s)) whereClause.status = s;
    }

    // 分页参数
    const currentPage = parseInt(current);
    const size = parseInt(pageSize);
    const skip = (currentPage - 1) * size;

    // 并行查询数据、总数以及各个状态的数量
    const [devices, total, availableCount, unavailableCount] = await Promise.all([
      prisma.device.findMany({
        where: whereClause,
        skip: skip,
        take: size,
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
              productionLine: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          id: 'asc'
        }
      }),
      prisma.device.count({
        where: whereClause
      }),
      prisma.device.count({
        where: { ...whereClause, status: 0 } // 可用
      }),
      prisma.device.count({
        where: { ...whereClause, status: 1 } // 不可用
      })
    ]);

    res.json({
      status: 'ok',
      message: '设备列表获取成功',
      data: {
        list: devices,
        total: total,
        availableCount,
        unavailableCount,
        current: currentPage,
        pageSize: size
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [getDevices]:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 获取单个设备详情
 */
exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.device.findUnique({
      where: { id: parseInt(id) },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
            productionLine: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({
        status: 'error',
        message: '设备不存在',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      message: 'Device fetched successfully',
      data: device,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [getDeviceById]:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 创建设备
 */
exports.createDevice = async (req, res) => {
  try {
    const { code, name, type, model, serialNumber, purchaseDate, status } = req.body;

    // 参数验证
    if (!code || !name || type === undefined || type === null) {
      return res.status(400).json({
        status: 'error',
        message: '设备编号、名称和类型为必填项',
        timestamp: new Date().toISOString()
      });
    }

    // 验证设备类型值（0-5）
    const typeInt = parseInt(type);
    if (isNaN(typeInt) || typeInt < 0 || typeInt > 5) {
      return res.status(400).json({
        status: 'error',
        message: '设备类型无效，必须为 0-5 之间的整数',
        timestamp: new Date().toISOString()
      });
    }

    // 验证状态值（0=可用, 1=不可用）
    const finalStatus = status !== undefined ? parseInt(status) : 0;
    if (![0, 1].includes(finalStatus)) {
      return res.status(400).json({
        status: 'error',
        message: '状态值无效，必须为 0（可用）或 1（不可用）',
        timestamp: new Date().toISOString()
      });
    }

    // 使用事务创建设备，如果状态为不可用，则同步创建一条维护记录
    const device = await prisma.$transaction(async (tx) => {
      const newDevice = await tx.device.create({
        data: {
          code,
          name,
          type: parseInt(type),
          model,
          serialNumber,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          status: finalStatus
        }
      });

      // 如果初始状态就是不可用 (1)，增加一条系统自动记录
      if (finalStatus === 1) {
        await tx.maintenanceRecord.create({
          data: {
            deviceId: newDevice.id,
            type: 'AUTO',
            title: '初始状态设置为不可用',
            content: '设备在创建时即被设置为不可用状态。',
            status: 0 // 进行中
          }
        });
      }

      return newDevice;
    });

    res.status(201).json({
      status: 'ok',
      message: '设备创建成功',
      data: device,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [createDevice]:', error);
    
    // 处理唯一性约束冲突
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: `设备编号 '${req.body.code}' 已存在`,
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
 * 更新设备
 */
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, type, model, serialNumber, purchaseDate, status, forceUnbind } = req.body;
    const deviceId = parseInt(id);

    // 1. 验证设备类型值（0-5）
    if (type !== undefined) {
      const typeInt = parseInt(type);
      if (isNaN(typeInt) || typeInt < 0 || typeInt > 5) {
        return res.status(400).json({
          status: 'error',
          message: '设备类型无效，必须为 0-5 之间的整数',
          timestamp: new Date().toISOString()
        });
      }
    }

    // 2. 验证状态值
    let targetStatus = undefined;
    if (status !== undefined) {
      targetStatus = parseInt(status);
      if (![0, 1].includes(targetStatus)) {
        return res.status(400).json({
          status: 'error',
          message: '状态值无效，必须为 0（可用）或 1（不可用）',
          timestamp: new Date().toISOString()
        });
      }
    }

    // 使用事务处理状态变更逻辑
    const updatedDevice = await prisma.$transaction(async (tx) => {
      // 查询更新前的设备状态
      const oldDevice = await tx.device.findUnique({
        where: { id: deviceId },
        include: { station: true }
      });

      if (!oldDevice) {
        throw new Error('NOT_FOUND');
      }

      const updateData = {};

      // 核心业务逻辑：绑定的设备如果要改为可用，必须确认解除绑定
      if (status !== undefined && targetStatus === 0 && oldDevice.stationId) {
        if (!forceUnbind) {
          const error = new Error('UNBIND_CONFIRM_REQUIRED');
          error.lineName = oldDevice.station.name;
          throw error;
        }
        // 如果确认强制解绑，将 stationId 设为 null
        updateData.stationId = null;
      }

      if (code !== undefined) updateData.code = code;
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = parseInt(type);
      if (model !== undefined) updateData.model = model;
      if (serialNumber !== undefined) updateData.serialNumber = serialNumber;
      if (purchaseDate !== undefined) {
        updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
      }
      if (status !== undefined) updateData.status = targetStatus;

      const device = await tx.device.update({
        where: { id: deviceId },
        data: updateData
      });

      // --- 维护记录自动闭环逻辑 ---
      
      // A. 状态变为 不可用 (1) -> 开启一条停机记录
      if (oldDevice.status !== 1 && targetStatus === 1) {
        await tx.maintenanceRecord.create({
          data: {
            deviceId: deviceId,
            type: 'AUTO',
            title: '设备停机',
            content: '系统检测到设备状态变更为“不可用”',
            status: 0 // 进行中
          }
        });
      }

      // B. 状态从 不可用 (1) 恢复 -> 关闭最近的一条停机记录
      if (oldDevice.status === 1 && targetStatus !== undefined && targetStatus !== 1) {
        const lastRecord = await tx.maintenanceRecord.findFirst({
          where: { deviceId, status: 0 },
          orderBy: { createdAt: 'desc' }
        });

        if (lastRecord) {
          await tx.maintenanceRecord.update({
            where: { id: lastRecord.id },
            data: {
              status: 1, // 已完成
              endTime: new Date(),
              title: '故障已恢复',
              content: lastRecord.content + ` (已于 ${new Date().toLocaleString()} 恢复可用)`
            }
          });
        }
      }

      return device;
    });

    res.json({
      status: 'ok',
      message: '设备更新成功',
      data: updatedDevice,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        message: '设备不存在',
        timestamp: new Date().toISOString()
      });
    }

    if (error.message === 'UNBIND_CONFIRM_REQUIRED') {
      return res.status(400).json({
        status: 'confirm_required',
        error: 'UNBIND_CONFIRM_REQUIRED',
        stationName: error.lineName,
        message: `该设备当前正绑定在工位 [${error.lineName}] 上。若要将其状态改为"可用"，必须先从工位移除。是否确认移除并修改状态？`,
        timestamp: new Date().toISOString()
      });
    }

    console.error('SERVER ERROR [updateDevice]:', error);
    
    // 处理唯一性约束冲突
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: `设备编号 '${req.body.code}' 已存在`,
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
 * 获取设备的维护记录
 */
exports.getDeviceMaintenanceRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const records = await prisma.maintenanceRecord.findMany({
      where: { deviceId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'ok',
      message: '维护记录获取成功',
      data: records,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [getDeviceMaintenanceRecords]:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误，请检查后台日志',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 删除设备
 */
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.device.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      status: 'ok',
      message: 'Device deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SERVER ERROR [deleteDevice]:', error);
    
    // 处理记录不存在
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: '设备不存在',
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
