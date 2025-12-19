const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('正在清理设备表数据...');
    const result = await prisma.device.deleteMany({});
    console.log(`✓ 成功删除 ${result.count} 条不兼容的设备记录`);
  } catch (error) {
    console.error('清理失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();

