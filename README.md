# formater-auth-service-js

## Installation
 ```
  npm install https://github.com/terresolide/formater-auth-service-js
 ```

## Login page
 You must create a page in the same domain as your application.  
 This is the **redirect url** configured with your identity provider
 ```html
   <script>
    function extractInfoFromURL (url) {
      var split = url.split(/\&|\?|#/)
      var params = []
      var authParams = []
      split.forEach(function(tab) {
        var value = tab.split('=')
        if (value.length > 1) {
          if (['code', 'state', 'session_state', 'error'].indexOf(value[0]) >= 0) {
            authParams[value[0]] = value[1]
          } else {
            params[value[0]] = value[1]
          }
        }
      })
      return {base: split[0], params: params, authParams: authParams}
    }
    var location = extractInfoFromURL(window.location.href)
    if (window.opener) {
      // case window
      window.opener.postMessage(
        {
          code:location.authParams['code'],
          state: location.authParams['state'],
          url: window.location.href
        },
        document.location.origin
      )
      window.close()
    } else if (parent) {
      // case iframe
      parent.postMessage( {
        code:location.authParams['code'],
        state: location.authParams['state'],
        url: window.location.href
      })
    } 
   </script>
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

 // to sign in / sign out
 var button = document.getElementById('#authButton')
 button.addEventListener('click', function (e) {
     service.login()
 })
 
 
 // to launch logout
 service.logout()

 // to get the token
 let token = service.getToken()

 // to get user
 let user = service.getUser()

 // Request more info about user
 service.getUserInfo(true)
 .then(user => { })

 ```
