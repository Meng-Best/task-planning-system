const fs = require('fs');
const path = require('path');

/**
 * 保存调度输入数据到测试文件
 * 用于开发环境，方便与正式接口文件比对
 */
exports.saveTestInput = async (req, res) => {
    try {
        const schedulingInput = req.body;

        if (!schedulingInput || typeof schedulingInput !== 'object') {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input data',
                error: 'Request body must be a valid scheduling input object',
                timestamp: new Date().toISOString()
            });
        }

        // 写入项目根目录下的 input_test.json
        const filePath = path.join(__dirname, '..', '..', '..', 'input_test.json');

        fs.writeFileSync(filePath, JSON.stringify(schedulingInput, null, 2), 'utf8');

        res.json({
            status: 'ok',
            message: 'Test input file saved successfully',
            data: {
                filePath: filePath,
                size: fs.statSync(filePath).size,
                savedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to save test input file',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * 获取测试输入文件内容
 */
exports.getTestInput = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', '..', '..', 'input_test.json');

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                status: 'error',
                message: 'Test input file not found',
                error: 'input_test.json does not exist',
                timestamp: new Date().toISOString()
            });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        res.json({
            status: 'ok',
            message: 'Test input file retrieved successfully',
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to read test input file',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};
