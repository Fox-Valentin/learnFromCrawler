// 一 先获取lastid
// 1 接口地址 + 参数
// get参数需要URI编码成十六进制
var http = require('http')
const cheerio = require('cheerio')
const startId = "652905"
const fetchLimit = 1
let fetched = 0

var baseUrl = 'http://www.cnbeta.com/'
let getLastId = function(_csrf, op) {
  var apiUrl = '/comment/read'
  return Promise(function(resolve,reject){
    if(!_csrf || !op){
      return reject(`getLastId() param err: _csrf: ${_csrf}, op: ${op}`)
    } else {
      apiUrl += '?_csrf=' + encodeURIComponent(_csrf) + '&op=' + encodeURIComponent(op)
      http.get(apiUrl,function(res){
        let resChunk = '';
        res.setEncoding('utf8')
        res.on('data',(chunk)=>{
          resChunk+=chunk
        })
        res.on('end',()=>{
          try{
            let json = JSON.parse(resChunk)
            let lastId = json.result.neighbor.lastId
            resolve(lastId)
          }catch(e){
            reject(e)
          }
        })
      })
    }
  })
}
// 检查抓取次数 超过则推出进程
// 对目标地址发送请求 并获取返回的数据
// 从返回的数据中提取 时间和标题
// 从返回的数据中提取下一篇的参数
let fetchPage = function(id, fullpath){
  if(fetched > fetchLimit){
    fetched = 0;
    console.log(`已经完成 ${fetchLimit}条数据`)
    return process.exit()
  }
  var targetUrl = `http://www.cnbeta.com/articles/soft/${startId}.htm`
  var client = http.get(targetUrl,function(res){
    let html = ''
    res.setEncoding = 'utf8'
    res.on('data',function(chunk){
      html += chunk
    })
    res.on('end',function(){
      if(html){
        fetched ++
        const $ = cheerio.load(html)
        let time = $('.cnbeta-article .title .meta span:first-child').text().trim()
        let news_title = $('.cnbeta-article .title h1').text().trim().replace(/\//g,'-')
        let _csrf = $('meta[name="csrf-token"]').attr('content')
        let op = '1,'
        let opStr = html.match(/{SID:[^{}]+}/)[0]
        op += opStr.match(/SID:"([^"]+)"/)[1] + ',' + opStr.match(/SN:"([^"]+)"/)
        console.log(time)
        console.log(news_title)
        console.log(_csrf)
        console.log(op)
      } else {
        console.log('fetchPage failed.', targetUrl)
      }
    })
  }).on('error',function(err){
    console.log(err)
  })
}
console.log(`即将抓取${fetchLimit}条数据`)
fetchPage(startId)