# keep-alive 作用

在http1.1的响应头上设置keep-alive可以在一个tcp连接上发送多个http请求

1. 避免了重开http的开销
2. 避免刷新时重新建立ssl连接的开销
3. 避免QPS过大时，服务器的连接数过大

