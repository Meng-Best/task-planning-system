  ———

  # 调度算法对接说明（现有接口与 input.json 映射）

  ## 1. input.json 结构概览

  - config.work_calendar: 起始日期、工作时段、节假日。
  - config.resources: crews(班组)、machines(设备)、part_stations(部装工位)、final_stations(总装工位)。
  - resources.teams[]: 班组编码、名称、能力列表（能力编码）。
  - 后续应还有订单/工序/工位分配等（示例截断）。

  ## 2. 现有后端数据与接口

  基础类型可参考 frontend/src/config/dictionaries.ts（工位类型、订单类型、状态等），后端接口在 backend/src/routes/*.js。

  ### 2.1 生产拆分/任务

  - GET /api/production-tasks/with-schedule?
    status=1&current=&pageSize=&orderCode=&productCode=&deadlineStart=&deadlineEnd=
      - 返回任务 + 订单 + 产品 + steps（拆分步骤，含产品）+ 产品的 routings（含 processes）。
      - 任务状态：0 待拆分，1 已拆分。
  - GET /api/schedules/:taskId：按任务取拆分步骤。
  - POST/DELETE /api/schedules/:taskId：保存/清空拆分（不建议算法阶段改动）。

  数据模型（prisma ProductionTask + ScheduleStep）：

  - Task: code, orderId, productId, deadline, status, priority, steps.
  - Step: type(0=舱段/部装，1=总装)，productId，seq。

  ### 2.2 订单/产品/工艺

  - GET /api/orders：订单，字段含 code/name/type/status/productId/quantity/deadline/scheduledQuantity。
  - GET /api/products：产品。
  - GET /api/products/:id/routings：产品关联的工艺路线（含工序 processes[seq,code,name]）。
  - POST /api/products/:id/routings：配置产品-路线关系。

  ### 2.3 资源（人、设备、工位）

  - GET /api/teams：班组（含 code/name，如需能力需扩展；当前无“能力列表”字段，与 input.json 的 capabilities 编码不直接对
    应）。
  - GET /api/devices：设备列表（可映射 machines）。
  - GET /api/stations：工位，type 0=部装，1=总装，2=测试；可映射 part_stations/final_stations。
  - 其他：/api/staffs 人员，/api/production-lines 产线。

  ### 2.4 工作日历

  - GET /api/calendar（calendarRoutes.js）：日历事件（节假日/调休），配合常量 FACTORY_WORK_HOURS(16 小时两班)。
  - 当前未提供“每日班次时间段”接口；input.json 的 start_hour/upstart_time... 需补充接口或用常量。

  ## 3. input.json 字段与现有数据的对齐评估

  | input.json | 可映射接口/字段 | 现状 | 差距/建议 |
  | --- | --- | --- | --- |
  | work_calendar.start_date/holidays | /api/calendar + 常量 | 有日历事件；工时常量固定16h，两班 | 需新增接口返回工作时
  段，或前端/算法内置常量 |
  | resources.crews | /api/teams | 有班组名称/编码 | 无“能力列表”字段，需扩展或用占位 |
  | resources.machines | /api/devices | 有设备列表 | 能力/类型映射需定义规则 |
  | part_stations/final_stations | /api/stations?type=0/1 | 有工位类型 | 命名需转换 |
  | teams[].capabilities | 无直接字段 | 现有 Team 无能力列表；Process/Station 有类型但无“P?-?-?”编码 | 需设计能力编码或
  映射规则 |
  | 任务/拆分/产品 | /api/production-tasks/with-schedule | 已包含 steps 与产品工艺路线 | 可直接作为算法订单/工序结构的输
  入 |
  | 工艺路线与工序 | /api/products/:id/routings (已包含 processes) | 数据齐备（示例返回 HFBSAIUF 等） | 若算法需所有路
  由，可能要多条路由合并策略 |

  ## 4. 结论

  - 生产任务 + 拆分 + 产品工艺：已有完整数据接口，可直接作为算法的“订单+工序”输入。
  - 设备/工位：有基础列表，但缺少“能力”与算法中的工序编码映射，需要补充能力规则或字典。
  - 班组能力：现接口缺失能力列表，需新增字段/接口或通过工序-工位-班组的规则派生。
  - 工作日历工时段：有日历事件，但缺少“每日班次时间段”接口；可新增返回 upstart_time/upend_time...，或在算法侧使用常量。
  - 订单类型文案已统一为“试制订单”。

  • 可以在“生产计划总览”放调度入口，建议方案：

  - 入口位置：总览页顶部加操作区（不占筛选空间），按钮“发送调度”/“导出调度输入”。
  - 作用范围：优先支持“按筛选结果批量发送”——即当前列表展示的已拆分任务集合（多条），再提供单卡片内的“发送当前任务”按钮。
    这样算法既可批量（常见场景）也可单个调试。
  - 数据来源：使用现有 GET /api/production-tasks/with-schedule 的返回作为输入（已含订单、产品、拆分 steps、产品工艺路
    线）。如需资源/日历，可由前端调用 /api/stations、/api/teams、/api/devices、/api/calendar 组装。
  - 交互建议：
      1. 顶部按钮“导出调度输入”→ 依据当前筛选条件拉取任务+附加资源，生成算法所需的 JSON（下载或复制弹窗）。
      2. 每个卡片右上角“发送该任务”→ 仅包装此任务及相关产品路由，便于局部验证。
  - 默认选择：批量发送当前筛选集合（更符合调度批处理场景），单个发送作为补充。

  这样既符合算法需要全局任务集，又保留单任务调试的灵活性。

 Q: 我的班组也是有工序能力的，就是设备没有，我能不能不调整算法，在送数据时涉及到设备能力，就默认设备能处理全部工序，在入
  口处调整输入数据
 A: • 可以，不用改算法，在导出/发送调度数据时做预处理：

  - 班组：沿用已有的工序能力列表（保持现状，按真实数据传递）。
  - 工位/设备：在组装输入数据时，给每台设备/工位附加一个 “全量工序” 能力集合。全量集合可从当前任务涉及的产品工艺路线里提
    取所有工序 code（或 seq+code 组合）去重后赋给每台设备的 capabilities 字段。
  - 类型匹配：仍用工位类型区分部装/总装，避免总装步骤派到部装工位。能力层面默认为全能即可。

  实现思路（不改算法，只改导出数据）：

  1. 从生产计划总览导出任务时，收集所有任务的 steps -> 取对应产品的工艺路线 -> 抽取所有工序编码组成 allProcessCodes。
  2. 班组的 capabilities 用真实数据；设备/工位的 capabilities 填 allProcessCodes（或按部装/总装类型过滤工序集合）。
  3. 生成算法输入 JSON 时，用上述“全能设备”能力字段替换/补充设备能力，算法侧无需改动。

  这样入口处就能让设备看起来拥有全部工序能力，不需要调整算法逻辑。