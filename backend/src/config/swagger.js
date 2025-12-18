const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Personal Task Planning System API',
      version: '1.0.0',
      description: '个人任务筹划系统 - RESTful API 文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '开发服务器'
      }
    ],
    components: {
      schemas: {
        // 通用响应结构
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-18T10:51:21.415Z'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              example: 'Error description'
            },
            error: {
              type: 'string',
              example: 'Detailed error message'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-18T10:51:21.415Z'
            }
          }
        },
        // 任务对象
        Task: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '任务ID',
              example: 1
            },
            name: {
              type: 'string',
              description: '任务名称',
              example: '完成项目文档'
            },
            title: {
              type: 'string',
              description: '任务标题',
              example: '撰写技术文档'
            },
            description: {
              type: 'string',
              description: '任务描述',
              example: '完成项目的技术架构文档'
            },
            status: {
              type: 'string',
              description: '任务状态',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              example: 'pending'
            },
            priority: {
              type: 'integer',
              description: '优先级 (0-5)',
              example: 3
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: '截止日期',
              example: '2025-12-25T00:00:00.000Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: '更新时间'
            }
          }
        },
        // 创建任务请求
        CreateTaskRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: '任务名称（必填）',
              example: '完成项目文档'
            },
            title: {
              type: 'string',
              description: '任务标题',
              example: '撰写技术文档'
            },
            description: {
              type: 'string',
              description: '任务描述',
              example: '完成项目的技术架构文档'
            },
            status: {
              type: 'string',
              description: '任务状态',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              default: 'pending'
            },
            priority: {
              type: 'integer',
              description: '优先级 (0-5)',
              default: 0,
              minimum: 0,
              maximum: 5
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: '截止日期'
            }
          }
        }
      }
    }
  },
  // 扫描路由文件以生成文档
  apis: ['./src/routes/*.js', './src/index.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

