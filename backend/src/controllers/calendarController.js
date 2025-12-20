const prisma = require('../prismaClient');

/**
 * 解析日期字符串为 Date 对象（只保留日期部分，时间设为 00:00:00）
 */
function parseDate(dateString) {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * 生成日期范围内的所有日期数组
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 获取指定日期范围内的日历配置
 * 支持查询全局日历或特定产线日历
 */
exports.getCalendarEvents = async (req, res) => {
  try {
    const { startDate, endDate, productionLineId } = req.query;

    // 参数验证
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters',
        error: 'startDate and endDate are required',
        timestamp: new Date().toISOString()
      });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // 日期范围验证
    if (start > end) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date range',
        error: 'startDate must be before or equal to endDate',
        timestamp: new Date().toISOString()
      });
    }

    // 构建查询条件
    const whereCondition = {
      date: {
        gte: start,
        lte: end
      }
    };

    // 如果指定了产线ID，返回全局配置 + 该产线的专用配置
    if (productionLineId) {
      whereCondition.OR = [
        { productionLineId: parseInt(productionLineId) },
        { productionLineId: null }
      ];
    } else {
      // 如果没有指定产线ID，只返回全局配置
      whereCondition.productionLineId = null;
    }

    // 查询日期范围内的日历事件
    const events = await prisma.calendarEvent.findMany({
      where: whereCondition,
      include: {
        productionLine: {
          select: {
            id: true,
            name: true,
            factoryId: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { productionLineId: 'asc' }
      ]
    });

    res.json({
      status: 'ok',
      message: 'Calendar events retrieved successfully',
      data: {
        events,
        count: events.length,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        productionLineId: productionLineId ? parseInt(productionLineId) : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve calendar events',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 批量设置日期范围的日历类型
 * 支持为全局或特定产线设置日历
 */
exports.setCalendarEvents = async (req, res) => {
  try {
    const { startDate, endDate, type, note, productionLineId } = req.body;

    // 参数验证
    if (!startDate || !endDate || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        error: 'startDate, endDate, and type are required',
        timestamp: new Date().toISOString()
      });
    }

    // 类型验证
    const validTypes = ['WORK', 'HOLIDAY', 'REST', 'DEFAULT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid type',
        error: `Type must be one of: ${validTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // 如果指定了产线ID，验证产线是否存在
    if (productionLineId) {
      const line = await prisma.productionLine.findUnique({
        where: { id: parseInt(productionLineId) }
      });
      if (!line) {
        return res.status(404).json({
          status: 'error',
          message: 'Production line not found',
          timestamp: new Date().toISOString()
        });
      }
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    // 日期范围验证
    if (start > end) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date range',
        error: 'startDate must be before or equal to endDate',
        timestamp: new Date().toISOString()
      });
    }

    // 生成日期范围内的所有日期
    const dates = generateDateRange(start, end);

    let result;
    const lineId = productionLineId ? parseInt(productionLineId) : null;

    // 如果类型是 DEFAULT，删除该范围内的配置（恢复默认）
    if (type === 'DEFAULT') {
      result = await prisma.calendarEvent.deleteMany({
        where: {
          date: {
            gte: start,
            lte: end
          },
          productionLineId: lineId
        }
      });

      return res.json({
        status: 'ok',
        message: 'Calendar events restored to default',
        data: {
          affectedDates: dates.length,
          deletedCount: result.count,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          productionLineId: lineId
        },
        timestamp: new Date().toISOString()
      });
    }

    // 使用事务批量设置日历事件
    result = await prisma.$transaction(async (tx) => {
      // 先删除该范围内已有的配置（仅针对指定产线或全局）
      await tx.calendarEvent.deleteMany({
        where: {
          date: {
            gte: start,
            lte: end
          },
          productionLineId: lineId
        }
      });

      // 批量创建新配置
      const createData = dates.map(date => ({
        date,
        type,
        note: note || null,
        productionLineId: lineId
      }));

      const created = await tx.calendarEvent.createMany({
        data: createData
      });

      return created;
    });

    res.status(201).json({
      status: 'ok',
      message: lineId 
        ? 'Production line calendar events set successfully'
        : 'Global calendar events set successfully',
      data: {
        affectedDates: dates.length,
        createdCount: result.count,
        type,
        note,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        productionLineId: lineId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to set calendar events',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 删除指定日期的日历事件
 * 支持删除全局或特定产线的事件
 */
exports.deleteCalendarEvent = async (req, res) => {
  try {
    const { date } = req.params;
    const { productionLineId } = req.query;

    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameter',
        error: 'date parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    const targetDate = parseDate(date);
    const lineId = productionLineId ? parseInt(productionLineId) : null;

    const deletedEvent = await prisma.calendarEvent.deleteMany({
      where: {
        date: targetDate,
        productionLineId: lineId
      }
    });

    if (deletedEvent.count === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Calendar event not found',
        error: `No event found for date ${date}${lineId ? ` and production line ${lineId}` : ''}`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ok',
      message: 'Calendar event deleted successfully',
      data: {
        date: targetDate.toISOString(),
        deletedCount: deletedEvent.count,
        productionLineId: lineId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete calendar event',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 判断指定日期是否为工作日
 * 返回该日期的工作状态（考虑系统默认规则 + 日历配置）
 * 如果指定了产线ID，产线配置优先于全局配置
 */
exports.checkWorkDay = async (req, res) => {
  try {
    const { date, productionLineId } = req.query;

    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameter',
        error: 'date parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    const targetDate = parseDate(date);
    const dayOfWeek = targetDate.getDay(); // 0=周日, 1-5=工作日, 6=周六
    const lineId = productionLineId ? parseInt(productionLineId) : null;

    let event = null;
    let configSource = 'default';

    // 如果指定了产线ID，先查找产线专用配置
    if (lineId) {
      event = await prisma.calendarEvent.findFirst({
        where: {
          date: targetDate,
          productionLineId: lineId
        },
        include: {
          productionLine: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (event) {
        configSource = 'production_line';
      } else {
        // 如果没有产线配置，查找全局配置
        event = await prisma.calendarEvent.findFirst({
          where: {
            date: targetDate,
            productionLineId: null
          }
        });
        if (event) {
          configSource = 'global';
        }
      }
    } else {
      // 未指定产线ID，只查找全局配置
      event = await prisma.calendarEvent.findFirst({
        where: {
          date: targetDate,
          productionLineId: null
        }
      });
      if (event) {
        configSource = 'global';
      }
    }

    let isWorkDay;
    let reason;

    if (event) {
      // 有配置：按配置判断
      isWorkDay = event.type === 'WORK';
      reason = event.note || `Configured as ${event.type}`;
    } else {
      // 无配置：按默认规则判断（周一至周五为工作日）
      isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;
      reason = isWorkDay ? 'Default weekday' : 'Default weekend';
    }

    // 根据用户要求，增加状态码 0 或 1 的输出
    // 0: 可排期（上班），1: 不可排期（休息）
    const scheduleStatus = isWorkDay ? 0 : 1;

    res.json({
      status: 'ok',
      message: 'Work day status checked',
      data: {
        date: targetDate.toISOString(),
        dayOfWeek,
        isWorkDay,
        scheduleStatus, // 新增：0=可排期, 1=不可排期
        eventType: event?.type || 'DEFAULT',
        reason,
        configSource,
        productionLineId: lineId,
        productionLineName: event?.productionLine?.name || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check work day status',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
