---
title: SkyWalking 使用
description: Rainbond通过插件整合SkyWalking，实现APM即插即用
keywords:
- SkyWalking
- APM
- SkyWalking 链路追踪
---

SkyWalking 是一个开源可观察性平台，用于收集、分析、聚合和可视化来自服务和云原生基础设施的数据。支持分布式追踪、性能指标分析、应用和服务依赖分析等；它是一种现代 APM，专为云原生、基于容器的分布式系统而设计。

Rainbond是一个开源的云原生应用管理平台，使用简单，不需要懂容器和Kubernetes，支持管理多个Kubernetes集群，提供企业级应用的全生命周期管理，功能包括应用开发环境、应用市场、微服务架构、应用持续交付、应用运维、应用级多云管理等。

本文整合的目标要达成，运行在Rainbond上的应用，通过开启Rainbond的SkyWalking插件，自动对接SkyWalking Server，灵活开启APM，不需要时关闭插件，实现即插即用的APM。


## 整合架构


SkyWalking对服务进行监控时服需要在被监控服务中启用agent服务，而SkyWalking agent需要配置到应用的启动命令，虽然对应用代码无侵入，但配置过程需要侵入应用。Rainbond通过插件实现对应用的无侵入，将SkyWalking的agent制作成Rainbond的 [初始化类型插件](https://www.rainbond.com/docs/get-start/concept/plugin/)，在应用容器启动之前将agent的jar包拷贝到应用容器，应用容器就能加载agent并连接SkyWalking Server，整个过程对应用容器无侵入，且拓展性强。对接其他APM也可以用类似方式，使用用户通过替换插件实现对接不同的APM工具。

下图展示了在Rainbond中使用SkyWalking对应用进行监控的结构

![](https://static.goodrain.com/docs/5.4/practices/skywalking/SkyWalking-Rainbond.png)


## Agent插件实现原理

Rainbond插件体系是相对于Rainbond应用模型的一部分，插件主要用来实现应用容器扩展运维能力。由于运维工具的实现有较大的共性，因此插件本身可以被复用。插件必须绑定到应用容器时才具有运行时状态，用以实现一种运维能力，比如性能分析插件、网络治理插件、初始化类型插件。

具有运行时的插件的运行环境与所绑定的组件从以下几个方面保持一致：

- **网络空间** 这个一个至关重要的特性，网络空间一致使插件可以对组件网络流量进行旁路监听和拦截，设置组件本地域名解析等。
- **存储持久化空间** 这个特性使得插件与组件之间可以通过持久化目录进行文件交换。
- **环境变量** 这个特性使得插件可以读取组件的环境变量。



SkyWalking与Rainbond融合的过程中，我们使用到了**初始化类型**插件，顾名思义这是一个在应用容器启动前能够进行初始化动作的的插件，其基本原理是利用 Kubernetes 的 [init容器](https://kubernetes.io/zh/docs/concepts/workloads/pods/init-containers/) 实现的，Pod能够包含多个容器，应用运行在这些容器里面，同时Pod也能够有一个或者多个先于应用容器启动的init容器，只有init容器运行成功后才会运行应用容器，在Rainbond中开通了该类型插件的组件会在应用容器启动之前运行插件中已定义的任务直至完成。所以只需定义在应用容器启动前，使用初始化类型容器将agent所需数据拷贝至对应目录下，这样后续服务则可以直接使用这些数据。

##  通过 Rainbond 一键安装 SkyWalking

我们已将 SkyWalking 制作为应用并发布至应用市场，用户可基于开源应用商店一键安装。

1. 安装 [Rainbond](https://www.rainbond.com/docs/quick-start/quick-install/);
2. 在开源应用商店搜索SkyWalking，点击安装即可一键安装；
3.安装完成，后续可通过Rainbond管理和运维SkyWalking。

SkyWalking 服务端在架构上分为四个部分：探针服务、后端服务、存储服务和 UI：

- **平台后端(oap-server)** 支持数据聚合、分析和流处理，包括跟踪、指标和日志。
- **存储(elasticsearch-7.13.4)** 通过开放/可插拔接口存储SkyWalking 数据。支持 ElasticSearch、H2、MySQL、TiDB、InfluxDB。
- **UI(skywalking-ui)** 是高度可定制的基于 Web 的界面，允许 SkyWalking 最终用户可视化和管理 SkyWalking 数据。
- **探针(agent)** 收集数据并根据 SkyWalking 要求重新格式化数据（不同的探针支持不同的来源）。

## 使用 SkyWalking 对服务进行监控

### 准备环境

 拥有一套被监控服务，可参考 [部署Spring Cloud Pig](/docs/how-to-guides/micro-service-deploy/pig-example)

### 配置 SkyWalking Agent 插件

**安装插件**

* 在 Rainbond 团队界面 —> 插件 -> 从应用市场安装插件 -> 搜索 `skywalking-agent` 并安装

**开通插件**

* 在每个组件内 -> 插件 -> 开通插件。

**添加环境变量**

为每个组件添加环境变量
```bash
JAVA_OPTS=-Dskywalking.agent.service_name=backend -javaagent:/tmp/agent/skywalking-agent.jar -Dskywalking.collector.backend_service=${OAP_HOST}:11800
```

|变量值|简介|
| :---: | :---- |
|-Dskywalking.agent.service_name=** |在SkyWalking UI中展示的服务名|
|-Dskywalking.collector.backend_service=Host:Port|SkyWalking oap-server的访问地址，用来接收skywalking trace数据|
|-javaagent:/tmp/agent/skywalking-agent.jar|指定需要注入的jar包地址|

- 建立依赖关系

将需要监控的各组件建立与 `SkyWalking oap-server` 服务的依赖关系，使其能够通过 `127.0.0.1` 的地址连接 `oap-server` 或者开启 `oap-server` 的对外地址，在被监控端填写该地址，则无需建立依赖关系。

### 访问 SkyWalking

访问 `skywalking-ui` 对外端口，进入可视化界面。

- 仪表盘

![](https://static.goodrain.com/docs/5.4/practices/skywalking/skywalking-page.png)

- 服务调用拓扑图

![](https://static.goodrain.com/docs/5.4/practices/skywalking/Service-Topology.jpg)



