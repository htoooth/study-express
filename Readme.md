# nodejs模块学习： express 解析
nodejs 发展很快，从 npm 上面的包托管数量就可以看出来。不过从另一方面来看，也是反映了 nodejs 的基础不稳固，需要开发者创造大量的轮子来解决现实的问题。

知其然，并知其所以然这是程序员的天性。所以把常用的模块拿出来看看，看看高手怎么写的，学习其想法，让自己的技术能更近一步。

## 引言
[前面一篇文章](http://www.cnblogs.com/htoooth/p/7116480.html)都已经研究过 express 3.x 中的核心框架 connect 的代码，这一阵来看看 express 3.x 和 express 4.x 的核心代码是怎样，特别关注两个部分：

1. express 3.x 中 connect 的使用。
2. express 4.x 中 的流程

## 解析
要使用 express 首先要明白几个概念：

* application (3.x)
* subApplication (3.x)
* router (3.x)
* middleware (3.x)
* route (3.x)
* layer (4.x)

首先 application 就是指的一个 express 实例，这个实例可以有自己环境变量等，而 subApplication 是指的 application 下面又会嵌套 一个 express 实例对像。

每一个 application 中都只有一个 router 路由对像，这个对像管理这个 application 下面有所有的 subApplication, middleware 和 route.

subApplication 不说了， middleware 的表现形式在 express 中有三种: `fn(req, res, next)`，`fn(err, req, res, next)`, `fn(req, res)`。

第一种是正常的中间件：你对数据进行处理，然后调用 next 调用下一个中间件。

而第二种是错识中间件： 你出错口才调用它，而且必须是 四个参数，不能多也不能少。

第三种也是对数据进行处理，但是没有 next 说明数据到里结束。

route 就指的某个具体的路由，就是比如：`get, post, delete, put, all`等方法，这类方法能新建一个路由的对像。

layer 是 4.x 新出来的概念，这个也简单，就是方法的执行体。所谓的执行体，在 3.x中， subApplication 调用 handle,　route调用　handle，　middleware 调用自己，而在 4.x 中，这些都变成了 layer ，统一起来了。 请求来了， 就遍历 layer 看看哪个 layer匹配了路由，然后执行 layer.handle_request 方法。

上面说了这么多就是说 一个 application 就是由 subApplication, middleware, route 组成的， 这些才是真正的有执行体的地方， 下面说下， 这几个部分怎样加入到一个 application 中去的。

subApplication 加到入到 application 一般是调用 use 方法:

```js
var userCenterApp = express()

var app = express()

app.use('/user', userCenterApp);

// app.use(subApplication);
```

在上面代码中， `/user` 是指的 子应用的 挂载点，可以理解成，这个子应用的所有的方法，都是在 `/user` 这个 url 之下执行的。

如果没有第一个参数， 那是个子应用的挂载点默认是 `/` 可以理解成根应用。

这其中，当子应用挂载成功到父应用上时，子应用会发出一个 mount 事件，express 会在默认情况下，把父应用的 settings, engines 等设置都拷过来。

```js
  this.on('mount', function onmount(parent) {
    // inherit trust proxy
    if (this.settings[trustProxyDefaultSymbol] === true
      && typeof parent.settings['trust proxy fn'] === 'function') {
      delete this.settings['trust proxy'];
      delete this.settings['trust proxy fn'];
    }

    // inherit protos
    // 复制属性到 子 express 的 request 和 response 中去
    setPrototypeOf(this.request, parent.request)
    setPrototypeOf(this.response, parent.response)
    setPrototypeOf(this.engines, parent.engines)
    setPrototypeOf(this.settings, parent.settings)
  });
```

如果你需要子应用与父应用有不同的设置，可以监听这个事件，可以这样做:

```js
var subApp = express();

subApp.on('mount', function(parent) {
  // dosomething
  delete parent.locals.settings; // 不继承父 App 的设置
  Object.assign(app.locals, parent.locals);
})
```

通常我们都不对 subApplication 进行设置，直接把父级 locals 变量直接合并过来。

middleWare 加入到 application 中也是使用 use 方法：

```js
var app = express();

app.use(function(req, res, next) {
//正常使用
})

app.use(function(next, req, res, next) {
//错误处理
})

app.use(function(req, res) {
// 到此为止
})

app.use('/user', function(req, res, next) {
//针对　/user 下的所有请求都调用此处方法
})

```
一般来说　错误处理中间件都会放在所有的中间件的最后面，这会有两个处理中间件，一个是针对客户端不可知路由，一个是针对服务器错误。

```js
app.all('*', function clientError(req, res, next) {
  res.rend('404');
})

app.use(function serverError(err, req, res, next) {
  res.rend('404);
})
```

router 加入到 application 中也是使用 use 方法:

```js
var router = express.Router()

var app = express();

router.get('/app', fn);

app.use(router);　// 挂载到　根目录　/ 下
app.use('/user', router);　// 挂载到　/user 下


```

route　加入到 application 中有两种方法：app, router

// 通过 app 使用
```js
// 这样使用
app.get('/user', fn1, fn2)
app.post('/user', fn3, fn4)
app.delet('/user', fn5, fn6)

// 也可以这样使用
var route = app.route('/user');

route.get(fn1, fn2)
     .post(fn3, fn4)
     .delete(fn5, fn6)

```

在 router 中，也可以这样使用:

```js
var router = express.Router()

router.get('/user', fn1, fn2)
router.post('/user', fn3, fn4)

// 另一种写法
var route = router.route('/user')

route.get(fn1, fn2)
     .post(fn3, fn4)

```

前面 route 中的 `fn*`,其实也是中间件，遵守中间件的使用方法。

而 express 中核心的路由循环，就在 _router.handle 中，如下：

```js
proto.handle = function handle(req, res, out) {
  var self = this;

  // some thing
  next();

  function next(err) {
    var layer;
    var match;
    var route;

    // 在这里每次请求会遍历所有下一个路由，直到 match 成功后，会跳出循环
    while (match !== true && idx < stack.length) {
      layer = stack[idx++];
      match = matchLayer(layer, path); // 这是核心方法
      route = layer.route;

      if (typeof match !== 'boolean') {
        // hold on to layerError
        layerError = layerError || match;
      }

      if (match !== true) {
        continue;
      }

      // 没有route 的 layer， 会匹配 match === true, 然后再下面再执行
      if (!route) {
        // process non-route handlers normally
        continue;
      }

      if (layerError) {
        // routes do not match with a pending error
        match = false;
        continue;
      }

      var method = req.method

      // 如果有路由，则看看有没有该方法如　get post　方法。
      var has_method = route._handles_method(method);


      // build up automatic options response
      if (!has_method && method === 'OPTIONS') {
        appendMethods(options, route._options());
      }

      // don't even bother matching route
      if (!has_method && method !== 'HEAD') {

        match = false;
        continue;
      }
    }

    // no match
    if (match !== true) {
      return done(layerError);
    }
    // store route for dispatch on change
    if (route) {
      req.route = route;
    }

    // this should be done for the layer
    self.process_params(layer, paramcalled, req, res, function (err) {
      if (err) {
        return next(layerError || err);
      }

      if (route) {
        return layer.handle_request(req, res, next);
      }
      //　移除多余的匹配
      trim_prefix(layer, layerError, layerPath, path);
    });
  }

  function trim_prefix(layer, layerError, layerPath, path) {

    // somenthing
    if (layerError) {
      layer.handle_error(layerError, req, res, next);
    } else {
      layer.handle_request(req, res, next);
    }
  }
```

流程就在，是否匹配路由，是否route中有方法，然后执行相应的方法上面。

调用流程： `app() ===> app.handle ===> this._router.handle ===> if layer.match(path) ==> layer.handle_request`

而 app.use 方法就是调用 _router.use 方法：

```js
// app.use
 fns.forEach(function (fn) {
    // non-express app
    if (!fn || !fn.handle || !fn.set) { // 如果只是一个函数，直接加入到 route 中
      return router.use(path, fn);
    }

    // 下面针对的是一个子 express 的应用，就是指有 handle 的应用

    debug('.use app under %s', path);
    fn.mountpath = path;
    fn.parent = this;

    // restore .app property on req and res
    router.use(path, function mounted_app(req, res, next) { //对所有的第三方的请求进行处理
      var orig = req.app;
      fn.handle(req, res, function (err) {
        setPrototypeOf(req, orig.request) // 这里每次都把属性复制过来，就是怕第三方的把属性给改了，之后让框架崩溃
        setPrototypeOf(res, orig.response)
        next(err);
      });
    });

```

router.use 方法

```js
proto.use = function use(fn) {
  var offset = 0;
  var path = '/';

  var callbacks = flatten(slice.call(arguments, offset));

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);

    layer.route = undefined; // 这个layer是没有路由的

    this.stack.push(layer);
  }

  return this;
};
```

## 总结
把 express 中的 middleware， application, router, route 概念弄清楚了，express 的用法也就清楚了。

另外，我在解析 express 代码时，也运行了 express 的代码， 同时打断点进行调试，并且在关键的地方也有注释，如果有需要，也可以从这个地址进行下查看：

[study-express](https://github.com/htoooth/study-express)

看代码主要是弄清楚具体的流程，和实现思想，给自己的架构添加想法。

下一篇要讲讲，express 中的最佳实践，包括项目规划， 目录结构，中间件使用，错误中间件，promise,co,await/await,限流，重写，子域名等。
