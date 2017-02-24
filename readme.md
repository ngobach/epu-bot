EPU Bot
====

**EPU Bot** cung cấp các tiện ích, tra cứu thông tin đến sinh viên ĐHĐL. EPU Bot được xây dựng trên NodeJS.

Cài đặt
----

### Yêu cầu

Trước khi bắt đầu cài đặt, cần phải có **ngrok** (dùng để tạo localtunnel https). Tải về và cài đặt **ngrok** ở [**đây**](https://ngrok.com/download).  
**Lưu ý**: ngrok phải có trong biến `%PATH%` của hệ thống.

Ngoài ra, có thể cần **nodemon** trong quá trình phát triển. Cài đặt **nodemon**:

```shell
npm i -g nodemon
```

### Setup

Trước tiên Clone project này từ github về:

```shell
git clone https://github.com/thanbaiks/epu-bot.git epu-bot && \
cd epu-bot && \
npm install && \
cp .env.example .env
```

Trước khi chạy cần phải thiết lập lại thông số của bot trong file **.env**.

```
code .env
```

Các thông số bao gồm:

* **PAGE_TOKEN** page access token, lấy từ trang facebook developer.
* **VERIFY_TOKEN** mã bí mật thống nhất giữa client và server, phải khớp với mã bí mật nhập trên trang developer.
* **APP_SECRET** Secret của facebook app.
* **HTTP_PORT** cổng lắng nghe của bot, mặc định là **80**.
* **NODE_ENV** just left *debug*.

### Run

Để khởi chạy: 

```
npm run tunnel
```

Sau khi chạy lệnh trên, copy đường đãn thu được: (https://*****.ngrok.com/), thiết lập lại webhook tại trang facebook developer.

Tiếp, trong 1 tab khác chạy lệnh:

```shell
npm start
```

Kết quả thu được

```
Express application running at 0.0.0.0:5000 [NODE_ENV: debug]
{ result: 'Successfully updated greeting' }
{ result: 'Successfully added new_thread\'s CTAs' }
{ result: 'Successfully added structured menu CTAs' }
```

Author
----

EPU Bot được viết bởi BachNX <mail@ngobach.com>. Get in touch with me at: <https://ngobach.com>. :grinning:

License
----

> Considering