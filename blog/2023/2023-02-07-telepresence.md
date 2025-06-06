---
title: 让远程成为本地，微服务后端开发的福音
description: Telepresence 是一个开源工具，用于在本地开发环境中模拟 Kubernetes 集群中的微服务，它允许开发人员在本地开发环境中运行和调试微服务，而不必担心环境的复杂性和配置困难
slug: telepresence
image: https://static.goodrain.com/wechat/telepresence/telepresence-architecture.inline.png
---

微服务后端开发的最大痛点之一就是调试困难，非常影响我们的开发效率。

如果我们想与其他微服务进行联动调试，则需要在本地环境中启动对应的微服务模块，这可能需要大量的配置和构建时间，同时也会占用我们本地很多资源，可能还会出现”带不动“的情况。

虽然说我们可以在测试服务器上进行调试，但整个流程也是比较漫长，**提交代码 -> 触发CI/CD -> 等待构建成功**，可能简单的 BUG 我们提交代码打个日志就能解决问题，当遇到复杂的 BUG 时通过这个方式在服务器上调试就非常难受了，太浪费时间了，**提交 -> 等待**，反反复复，始终没有本地开发工具直接调试的方便。

下面介绍的工具将远程和本地融为一体，让本地开发更加流畅。

<!--truncate-->

## Telepresence

Telepresence 是一个开源工具，用于在本地开发环境中模拟 Kubernetes 集群中的微服务，它允许开发人员在本地开发环境中运行和调试微服务，而不必担心环境的复杂性和配置困难。

![](https://static.goodrain.com/wechat/telepresence/telepresence-architecture.inline.png)

简单来说 Telepresence 将 Kubernetes 集群中服务的流量代理到本地，Telepresence 主要有四个服务：

**Telepresence Daemon:** 本地的守护进程，用于集群通信和拦截流量。

**Telepresence Traffic Manager:** 集群中安装的流量管理器，代理所有相关的入站和出站流量，并跟踪主动拦截。

**Telepresence Traffic Agent:** 拦截流量的 sidecar 容器，会注入到工作负载的 POD 中。

**Ambassador Cloud:** SaaS 服务，结合 Telepresence 一起使用，主要是生成预览 URL 和一些增值服务。

### 全局流量拦截

全局流量拦截是将 Orders 的所有流量都拦截到我们本地开发机上，如下图。

![](https://static.goodrain.com/wechat/telepresence/global.png)

### 个人流量拦截

**个人流量拦截**允许选择性地拦截服务的部分流量，而不会干扰其余流量。这使我们可以与团队中的其他人共享一个集群，而不会干扰他们的工作。每个开发人员都可以只针对他们的请求拦截 Orders 服务，同时共享开发环境的其余部分。

个人拦截需要配合 `Ambassador Cloud` 使用，这是一项收费服务，免费用户可以最多拦截 3 个服务。

![](https://static.goodrain.com/wechat/telepresence/ind.png)

## 结合 Telepresence 开发调试 Rainbond 上的微服务

* 基于[主机安装 Rainbond ](https://www.rainbond.com/docs/installation/install-with-ui/)或基于 [Helm 安装 Rainbond](https://www.rainbond.com/docs/installation/install-with-helm/)。

### 安装 Telepresence 

MacOS：

```bash
# Intel
brew install datawire/blackbird/telepresence

# M1
brew install datawire/blackbird/telepresence-arm64
```

Windows：

```bash
# 使用管理员身份打开 Powershell

# 下载压缩包
Invoke-WebRequest https://app.getambassador.io/download/tel2/windows/amd64/latest/telepresence.zip -OutFile telepresence.zip

# 解压缩包
Expand-Archive -Path telepresence.zip -DestinationPath telepresenceInstaller/telepresence
Remove-Item 'telepresence.zip'
cd telepresenceInstaller/telepresence

# 安装
powershell.exe -ExecutionPolicy bypass -c " . '.\install-telepresence.ps1';"
```

### 安装 Telepresence 流量管理器到集群中

可以使用 Telepresence 快速安装 Traffic Manager，本地需要有 kubeconfig 文件 `~/.kube/config`。

```bash
$ telepresence helm install
...
Traffic Manager installed successfully
```

或者在 Kubernetes 集群中使用 [Helm 安装 Traffic Manager](https://www.getambassador.io/docs/telepresence/latest/install/helm)。

### 本地连接远程服务

本地使用 `telepresence connect` 连接远程 Kubernetes API Server，本地需要有 kubeconfig 文件 `~/.kube/config`

```bash
$ telepresence connect
connected to context <your-context>
```

### 在 Rainbond 上快速部署 Pig 微服务应用

通过 Rainbond 开源应用商店快速部署 Pig 微服务应用，部署后如下图

![](https://static.goodrain.com/wechat/telepresence/rainbond-pig.png)

后面会以 pig-auth 这个服务为例，演示本地开发调试的流程，这里需要做一些小改动：

1. 从应用商店安装的应用默认 Workload 是字符串，需要修改 Workload 为易于查看的，这里以 pig-auth 为例，进入组件中编辑组件名称，修改组件英文名称为 `auth`

2. 简单来说 telepresence 的工作原理就是代理 k8s service，默认 gateway 到 auth 是使用的 nacos 做的负载均衡，这样的话 telepresence 是无法拦截到流量的，我们需要修改 gateway 配置使用 k8s service 做负载均衡。

   * 打开 pig-register 组件的 8848 对外端口，访问 nacos，修改 `pig-gateway-dev.yml` 的 `spring.cloud.gateway.routes.uri: http://gr795b69:3000` ，`gr795b69:3000` 通过 pig-auth 组件内的端口访问地址获取。

3. 如果本地只启动一个 pig-auth 服务，pig-auth 需要连接 pig-register 和 redis，那么就需要将这俩服务的对外端口打开，并修改配置文件让本地的 pig-auth 服务可以连接远程到 pig-register 和 redis。


### 在本地调试 auth 服务

使用 IDEA 或 VScode 在本地启动 pig-auth 服务。

在本地使用 telepresence 拦截 pig-auth 流量，命令如下：

```bash
$ telepresence intercept <workload> --port <local-port>:<service port name> -n <namespace>
```

命令拆解：

```bash
# <workload>
# 需要拦截流量的服务 workload
$ kubectl get deploy -n zq
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
pig-auth       1/1     1            1           146m

# <local-port> 本地端口

# <service port name>
# 需要拦截流量的服务的 service port name
$ kubectl get svc gr795b69 -n zq -o yaml
...
  ports:
  - name: http-3000
    port: 3000
    protocol: TCP
    targetPort: 3000
...

# <namespace> 命名空间
```

最终命令：

```bash
$ telepresence intercept pig-auth --port 3000:http-3000 -n zq
Using Deployment pig-auth
intercepted
   Intercept name         : pig-auth-zq
   State                  : ACTIVE
   Workload kind          : Deployment
   Destination            : 127.0.0.1:3000
   Service Port Identifier: http-3000
   Volume Mount Error     : sshfs is not installed on your local machine
   Intercepting           : all TCP requests
```

我们在本地给退出登陆这块逻辑打上断点，然后通过线上的前端退出登陆，打到我们本地 IDEA上，整体效果如下：

![](https://static.goodrain.com/wechat/telepresence/telepresence-debug.gif)

## 最后

Telepresence 可以帮助我们简化本地开发流程，同时保证代码的正确性和可靠性。还能使我们在集群中轻松调试和测试代码，提高开发效率。结合 Rainbond 的部署简化，从开发到部署都非常的简单，让我们专注于代码编写。

