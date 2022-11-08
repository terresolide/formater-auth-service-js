# formater-auth-service-js

## Installation
 ```
  npm install https://github.com/terresolide/formater-auth-service-js
 ```

## Login page
 You must create a page in the same domain as your application
 This is the redirect url configured with your identity provider
 ```js
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
 
 service.on('error', function (error) {
  // do something
 })
 // To launch sign in 
 service.login()
 
 // to launch logout
 service.logout()

 // to get the token
 let token = service.getToken()

 // to get user
 let user = service.getUser()

 // More info about user
 service.getUserInfo(true)
 .then(user => { })

 ```
