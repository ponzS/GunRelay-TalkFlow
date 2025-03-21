# Gun Realy -TalkFlow  MacOS & Windows
<img width="905" alt="截屏2025-03-21 04 49 32" src="https://github.com/user-attachments/assets/25a3dbcb-b0df-4c0d-8d9a-dd6557ba4deb" />

This version is a minimalist repeater. When you open the application, you can automatically run the repeater without any other operations.

However, you can choose whether to enable storage by yourself through the bottom button.

That is, any device connected to your repeater will store the data on the local disk of the repeater.

It provides the running time and the number of active connections, which is convenient for you to observe the current operation of the repeater.

You can directly copy the Relay URL in the page, or add it to your TalkFlow application by scanning the relay.

This version is for all users, so the default standard mode.

Supernode is suitable for more professional users to deploy the Linux version on their own servers.

What is a super node?

The super node can provide the function of STUN/TURN signaling server.

However, for the data, which is only read and not written, it can be understood that it is used for transit and auxiliary connection in the service area on the highway, and it is not necessary.

# Local deployment steps through the source code

Installation dependency
```base
yarn install
```

Start directly
```base
yarn dev
```

Build the installation package
```base
yarn dist
```

How to enable the super repeater?

Just change super to true.
```base
    this.gun = Gun({
      super: false, // true
      file: 'store',
      radisk: storeEnabled,
      web: server,
      multicast: { port: 8765 },
    });
```
But please pay attention! The super repeater will not write data, that is to say, if you directly use the super repeater to write, it will fail, and you will encounter a situation in communication that you can receive data but cannot send data.


# My boss
# Gun DB  by Mark
https://github.com/amark/gun

# Gun-Vue  by Davay
https://github.com/DeFUCC/gun-vue


# The last
You can directly use this warehouse to customize your favorite appearance and design, including extension functions and distribution. If you want to get more decentralization, please download TalkFlow on the AppStore!






# 中文
这个版本是一个极简中继器，打开应用即可自动运行中继器，无需其他的操作。

但是可以通过底部按钮自行选择是否启用储存。
也就是任何连接您中继器的设备会将数据储存在中继器本地磁盘。

提供了运行时长和活跃连接数量，便于您观察当前中继器运行情况。
您可以直接复制页面中的Relay URL，或通过扫码讲中继器添加到您的TalkFlow应用程序中。

这个版本面向所有用户 所以默认标准模式。
超级节点适合更专业的用户在自己的服务器中部署Linux版本。

什么是超级节点？
超级节点可以提供STUN/TURN信令服务器的功能。
但对于数据只读不写，可以理解它是在高速公路上的服务区用于中转和辅助连接，它并非必要的。

# 通过源代码本地部署步骤

安装依赖
```base
yarn install
```

直接启动
```base
yarn dev
```

构建安装包
```base
yarn dist
```

如何启用超级中继器？

将super改为true即可。
```base
    this.gun = Gun({
      super: false, // true
      file: 'store',
      radisk: storeEnabled,
      web: server,
      multicast: { port: 8765 },
    });
```
但请注意！超级中继器不会写入数据，也就是说如果您直接使用超级中继进行写入会失败，在通信中会遇到您可以收到数据但却无法发送数据的情况。


# 请关注他们
# Gun DB  by Mark
https://github.com/amark/gun

# Gun-Vue  by Davay
https://github.com/DeFUCC/gun-vue


# 最后
您可以直接使用本仓库自定义您喜欢的外观和设计，包括扩展功能和分发。 如果您希望获得更多去中心化力量请在AppStore下载TalkFlow！
