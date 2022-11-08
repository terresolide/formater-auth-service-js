# formater-auth-service-js

## Installation
 ```
  npm install https://github.com/terresolide/formater-auth-service-js
 ```

## Use

```js
 import {AuthService} from 'formater-auth-service-js'
 AuthService.SetRedirectUri('https://domain/page-login', 'https://domain/page-logout')

 let service = new AuthService('identifier', {
       'openidUrl': 'https://sso-url',
       'clientId': 'app-id-in-sso',
       'method': 'public'
  })
 service.add()
 service.on('authenticated', function (user, serv) {
   // do something
 )}
 service.on('logout', function () {
   // do something
 })

 // To launch sign in 
 service.login()
 
 // to launch logout
 service.logout()

 // to get the token
 let token = service.getToken()

 ```
