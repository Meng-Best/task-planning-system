import React from 'react';
import { Transfer, Tree } from 'antd';
import type { TransferProps } from 'antd';
import type { DataNode } from 'antd/es/tree';

interface TreeTransferProps extends TransferProps<any> {
  dataSource: any[];
}

const isChecked = (selectedKeys: (string | number)[], eventKey: string | number) =>
  selectedKeys.includes(eventKey);

const generateTree = (treeNodes: DataNode[] = [], checkedKeys: string[] = []): DataNode[] =>
  treeNodes.map(({ children, ...props }) => ({
    ...props,
    disabled: checkedKeys.includes(props.key as string),
    children: generateTree(children, checkedKeys),
  }));

const TreeTransfer: React.FC<TreeTransferProps> = ({ dataSource, targetKeys, ...restProps }) => {
  // 1. 数据转换：将扁平的 Staff 列表转换为按专业分类的 Tree 数据
  const MAJOR_MAP: Record<number, string> = {
    0: '总体', 1: '动力', 2: '结构', 3: '电气', 4: '质量', 5: '总装', 6: '工艺'
  };

  const treeData: DataNode[] = Object.keys(MAJOR_MAP).map(majorId => {
    const id = parseInt(majorId);
    const children = dataSource
      .filter(item => item.major === id)
      .map(item => ({
        key: item.id.toString(),
        title: `${item.name} (${item.staffId})`,
      }));

    return {
      key: `major-${id}`,
      title: MAJOR_MAP[id],
      children,
      selectable: false, // 专业分类节点不可选
    };
  }).filter(node => node.children && node.children.length > 0);

  // 2. 扁平化数据用于 Transfer 右侧展示
  const transferDataSource: any[] = dataSource.map(item => ({
    key: item.id.toString(),
    title: item.name,
    description: item.staffId,
  }));

  return (
    <Transfer
      {...restProps}
      targetKeys={targetKeys}
      dataSource={transferDataSource}
      render={(item) => item.title}
      showSelectAll={false}
      style={{ width: '100%' }}
      listStyle={{
        width: '100%',
        height: 400,
      }}
    >
      {({ direction, onItemSelect, selectedKeys }) => {
        if (direction === 'left') {
          const checkedKeys = [...selectedKeys, ...(targetKeys || [])].map(key => key.toString());
          return (
            <div style={{ padding: '4px 8px', height: 350, overflowY: 'auto' }}>
              <Tree
                blockNode
                checkable
                checkStrictly
                defaultExpandAll={false}
                checkedKeys={checkedKeys}
                treeData={generateTree(treeData, (targetKeys as string[]) || [])}
                onCheck={(_, { node: { key } }) => {
                  onItemSelect(key as string, !isChecked(checkedKeys, key as string));
                }}
                onSelect={(_, { node: { key } }) => {
                  onItemSelect(key as string, !isChecked(checkedKeys, key as string));
                }}
              />
            </div>
          );
        }
        return null;
      }}
    </Transfer>
  );
};

export default TreeTransfer;

