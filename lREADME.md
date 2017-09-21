# learnFromCrawler
本项目是学习练习 是参考前端路上（http://refined-x.com/）  的爬虫项目 谢谢作者

在这里介绍一些该项目运用的一些工具<br>

### cheerio 这个工具相当于服务端的jq <br>
在此项目中，你可以将请求返回的页面源码，用这个工具转换为dom对象<br>
转换为dom对象后，提取一些数据就方便的多了<br>

例子：
```
html = "<div id='box'>123</div>"
const cheerio = require('cheerio')
const $ = cheerio.load(html)
$("#box").text()
=> 123
```
### Promise 算是大名鼎鼎了 它主要的作用是将繁琐的回调嵌套 转换为 链式形式<br>
它还有一个不错的方法就是 all 和 race <br>
对于它的详细讲解 下面给出链接 可以看看<br>
*大白话讲解Promise（一）(http://www.cnblogs.com/lvdabao/p/es6-promise-1.html)<br>
*大白话讲解Promise（二）理解Promise规范  (http://www.cnblogs.com/lvdabao/p/5320705.html)<br>
*大白话讲解Promise（三）搞懂jquery中的Promise  (http://www.cnblogs.com/lvdabao/p/jquery-deferred.html)<br>

### encodeURIComponent encodeURI 这算是一个小知识点<br>

先说说 URI和URL之间的关系<br>
URI是URL的超集<br>
URI 的全称是 uniform resource identifier 统一资源标识符<br>
URL 的全称是 uniform resource locatior 统一资源定位器<br>
联系：<br>
再说说上面这两个看起来很像的方法有什么区别与联系<br>
一把字符串作为 URI 进行编码 一般这两个方法都是将字符串转化为十六进制的编码  用来处理url字符串的<br>

区别：<br>
encodeURI <br>
不会转义一些特殊字符 例如 ：;/?:@&=+$,#  这些用于分隔 URI 组件的标点符号 一般用于转义整个url<br>
encodeURIComponent <br>
会转义上述特殊字符 所以更适合转义 url中的参数等部分字符串<br>
escape<br>
这个函数有类似的功能，它对字符串进行编码，这样就可以在所有的计算机上读取该字符串<br>

可参考两篇文章 <br>
http://www.cnblogs.com/qiantuwuliang/archive/2009/07/19/1526687.html <br>
https://www.ibm.com/developerworks/cn/xml/x-urlni.html<br>
http://www.cnblogs.com/gaojing/archive/2012/02/04/2413626.html<br>

### request
request一般用来发起定制请求
请求文件流
```
request('http://google.com/doodle.png').pipe(fs.createWriteStream('doodle.png'))
```
或者将文件传给请求<br>
```
fs.createReadStream('file.json').pipe(request.put('http://mysite.com/obj.json'))
```
也可以将文件流pipe给自己<br>
```
request.get('http://google.com/img.png').pipe(request.put('http://mysite.com/img.png'))
```
还可以处理响应<br>
```
request
  .get('http://google.com/img.png')
  .on('response', function(response) {
    console.log(response.statusCode) // 200
    console.log(response.headers['content-type']) // 'image/png'
  })
  .pipe(request.put('http://mysite.com/img.png'))
```
可以处理流中的错误事件<br>
```
request
  .get('http://mysite.com/doodle.png')
  .on('error', function(err) {
    console.log(err)
  })
  .pipe(fs.createWriteStream('doodle.png'))
```
 可以在处理请求中 返回其他资源的响应<br>
```
 req.pipe(request('http://mysite.com/doodle.png')).pipe(resp)
```
 当然 这种方式 会产生安全隐患<br>
 这个就讲到这里 它还有更多的应用 例如定制请求头等 更多内容见参考<br>
参考<br>
https://segmentfault.com/a/1190000000385867<br>
https://www.npmjs.com/package/request<br>
