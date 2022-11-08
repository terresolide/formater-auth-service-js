/**
 * Manage authentication services
 * @class AuthService
 */
import jwt_decode from 'jwt-decode'

class AuthService {
 /**
  * default/global keycloak provider url (with realm)
  * @property {string} _keycloakUrl
  * @private
  * @static
  * @exemple "https://my-keycloak/auth/realms/my-realm"
  */
 static _keycloakUrl = null
  
 /**
  * The redirectUri pass to all service
  * @property {string} _redirectUri 
  * @private
  * @static
  */
 static _redirectUri = null
 
 /**
  * Redirect uri after logout (same as _redirectUri if not exists)
  * @property _redirectUriLogout
  * @private
  * @static
  */
 static _redirectUriLogout = null
 /**
  * Size of popup
  * @property {object} _size
  * @property {number} [_size.width=850] 
  * @property {number} [_size.height=750]
  * @private
  * @static
  */
 static _size = {
    width: 850,
    height: 750
  }
  
 /**
  * Set class configuration
  * @param {object} config - the global configuration
  * @param {string} config.keycloakUrl keycloak provider url {optional}
  * @param {string} config.redirectUri this app redirect url after login to service
  * @param {string} config.redirectUriLogout this app redirect url after logout if different from redirectUri
  * @param {number} config.width the auth popup width {optional}
  * @param {number} config.height the auth popup height {optional}
  */
 static setConfig (config) {
    if (config.hasOwnProperty('keycloakUrl')) {
      AuthService._keycloakUrl = config.keycloakUrl
    }
    if (config.hasOwnProperty('redirectUri')) {
      AuthService._redirectUri = config.redirectUri
      AuthService._redirectUriLogout = config.redirectUri
    }
    if (config.hasOwnProperty('redirectUriLogout')) {
       AuthService._redirectUriLogout = config.redirectUriLogout
    }
    if (config.hasOwnProperty('width')) {
      AuthService._size.width = config.width
    }
    if (config.hasOwnProperty('height')) {
      AuthService._size.height = config.height
    }
  }
 /**
  * Set the global keycloakUrl
  * @param {string} keycloakUrl
  */
 static setKeycloakUrl (keycloakUrl) {
  AuthService._keycloakUrl = keycloakUrl
 }
 /**
  * Set the application redirectUri after login and logout
  * the same for all authentication services
  * @param {string} redirectUriLogin
  * @param {string} redirectUriLogout {optional}
  * @static
  */
 static setRedirectUri (redirectUriLogin, redirectUriLogout) {
  AuthService._redirectUri = redirectUriLogin
  AuthService._redirectUriLogout = redirectUriLogout || redirectUriLogin
 }
 /**
  * Set authentication popup dimension
  * @param {number} width
  * @param {number} height
  * @static
  */
 static setSize(width, height) {
  AuthService._size.width = width
  AuthService._size.height = height
 }
 /**
 * @callback authCallback
 * @param {object} user - user identity
 * @param {object} service - this service
 */
 /**
 * @callback logoutCallback
 */
 /**
  * @callback errorCallback
  * @param {string} name - error name
  */
 /**
  * Callback functions
  * @property _callback Array of functions
  * @type {authCallback} _callback.authenticated
  * @type {logoutCallback} _callback.logout
  * @type {errorCallback} _callback.error
  * @private
  */

 _callback = {
   authenticated: null,
   logout: null,
   error: null
 }
 /**
  * Listen code from popup
  * @property {eventListener} _codeListener
  * @private
  */
 _codeListener = null
 
  /**
  * The service configuration
  * @property {object} _config
  * @property {string} _config.authUrl - endpoint to request a code (with redirection)
  * @property {string} _config.clientId - client identifier with the identity provider
  * @property {string} _config.logoutUrl - endpoint to logout
  * @property {string} _config.method='public' - public or backend-token or backend-session, the method used to authenticate the user
  * @property {string} _config.tokenUrl - endpoint to request an access token
  * @property {string} _config.type='keycloak' - type of service: keycloak | external
  * @property {string} _congig.refreshUrl - endpoint to refresh the token or the session
  * @property {string} _config.userinfoUrl - endpoint to request user info

  * @private
  */
 _config = {
   authUrl: null,
   clientId: null,
   logoutUrl: null,
   method: 'public',
   tokenUrl: null,
   type: 'keycloak',
   refreshUrl: null,
   userinfoUrl: null
 }
 
 /**
  * @property {string} _id - Identifier of Service
  * @private
  */
 _id = null
 
 /**
  * @property {object} _identity-  User identity depends of provider
  * @private
  */
 _identity = null
 
 /**
  * @property {DOMNode} _iframe - an hidden iframe to authenticate in background
  * @private
  */
 _iframe = null
 
 /**
  * @property {number} _expire - Number of milliseconds before the token expires
  * @private
  */
 _expire = null
 
 /**
  * @property {intervalID} _timer - an interval identifier
  * @private
  */
 _timer = null
 
 /**
  * @property {string} _refreshToken - the refresh token
  * @private
  */
 _refreshToken = null
 
 /**
  * @property {string} _token - the access token
  * @private
  */
 _token = null

 /**
 * Create an authentication service
 * @param {string} id  service identifier
 * @param {object} config  service configuration
 * @param {string} config.type="keycloak" - the type of authentication service in [keycloak, openid, external ...] {optional}
 * @param {string} config.method="public" - the auth method among ['public', 'backend-token', 'backend-session']
 * @param {string} config.keycloakUrl - keycloak service url, if different from static keycloakUrl {optional}
 * @param {string} config.authUrl - the provider auth url, optional if keycloakUrl {optional}
 * @param {string} config.tokenUrl - the url where obtains the token, optional if keycloakUrl {optional}
 * @param {string} config.refreshUrl - the url where refresh the token or session, optional if keycloakUrl {optional}
 * @param {string} config.logoutUrl - the service logout url
 * @param {string} config.openidUrl - the auth provider url {optional}
 *   
 */
 constructor (id, config) {
  this._id = id
  this._config = Object.assign(this._config, config) 
  if ((this._config.hasOwnProperty('keycloakUrl') || AuthService._keycloakUrl)) {
    var keycloakUrl = this._config.hasOwnProperty('keycloakUrl') ? this._config.keycloakUrl : AuthService._keycloakUrl
    // add slash to ended keycloakUrl if not have
    if (keycloakUrl.substr(-1) != '/') {
      keycloakUrl = keycloakUrl + '/'
    }
    this._config.type = 'keycloak'
    // for openid can also use the well-known url to find the endpoints
    // https://my-keycloak/auth/realms/test/.well-known/openid-configuration
    this._config.authUrl = keycloakUrl + 'protocol/openid-connect/auth'
    this._config.tokenUrl = keycloakUrl + 'protocol/openid-connect/token'
    this._config.refreshUrl = this._config.tokenUrl
    this._config.userinfoUrl = keycloakUrl + 'protocol/openid-connect/userinfo'
    this._config.logoutUrl = keycloakUrl + 'protocol/openid-connect/logout'
    
  } else if (config.openidUrl) {
    this._requestOpenidEndpoints(config.openidUrl)
  }
  this._initState(id)
 }
 /**
  * Add service to the DOM
  */
 add () {
   if (this._config.iframe && !this._iframe) {
     this._iframe = document.createElement('iframe')
     this._iframe.style.display = 'none'
     this._iframe.setAttribute('src', this._getLoginUrl())
     document.body.appendChild(this._iframe)
   }
   if (this._codeListener) {
    return
  }
   this._codeListener = this._receiveMessage.bind(this)
   window.addEventListener('message', this._codeListener)
 }
 /**
  * Get user email
  * @returns {string}
  */
 getEmail () {
   if (this._identity && this._identity.email) {
    return this._identity.email
   }
   return null
 }
 /**
  * Get the service identifier
  * @returns {string} 
  */
 getId () {
  return this._id
 }
 /**
  * Get the access token
  * @returns {string}
  */
 getToken () {
  return this._token
 }
 /**
  * Get user
  * @returns {object}
  */
  getUser () {
    return this._identity
  }

 /**
  * Get user info
  * @returns {Promise} Promise object represents the user identity
  */
 getUserInfo () {
    var self = this
    return new Promise((resolve, reject) => {
        return self._requestUserInfo(resolve, reject)
    })
}
 /**
  * Open window to login
  */
 login () {
    
    this.popup = window.open(this._getLoginUrl(), "_blank", "height=" + AuthService._size.height + ", width=" + AuthService._size.width + ", status=yes, toolbar=no, menubar=no, location=no,addressbar=no");
    var _this = this
    var loop = setInterval(function() {
      if (_this.popup.closed) {
        clearInterval(loop)
        _this.waiting = false
        _this.popup = null
      }
    })
 }
 /**
  * logout user to the service
  */
 logout (second) {
   if (!second && this._config.logoutUrl) {
     this._logout()
     return
   }
   this._resetUser()
 }
 /**
  * Record the callback function on event
  * @param {string} eventName - the event name like "authenticated" or "logout"
  * @param {authCallback | logoutCallback} callback - the callback function 
  */
 on (eventName, callback) {
  if (this._callback.hasOwnProperty(eventName)) {
    this._callback[eventName] = callback
  }
 }
 /**
  * Remove service from DOM
  */
 remove () {
    this._resetUser()
    window.removeEventListener('message', this._codeListener)
    this._codeListener = null
    if (this._iframe) {
      this._iframe.remove()
      this._iframe = null
    }
 }
 /**
  * Get the SSO login url with complete query
  * @returns {string} sso login url
  */
  _getLoginUrl () {
   var url = this._config.authUrl + '?'
    var params = {
          redirect_uri: encodeURIComponent(AuthService._redirectUri),
          response_type: 'code',
          client_id: this._config.clientId,
          scope: 'openid',
          state: this._state
      }
    var paramsStr = Object.keys(params).map(function (key) {
       return key + '=' + params[key]
    }).join('&')
    url += paramsStr
    return url
 }
 /**
  * Initialize the state and nonce of login request with service config
  * @param {string|number} id - service identifier
  */
  _initState (id) {

      var date = new Date()
      var y = date.getYear() + ''
      var str = id + '_' + date.getMonth() + '_' + date.getDate()
      this._nonce = btoa(str).replace(/=|\+|\//gm, '0')
      this._state = btoa('app_fmt' + id).replace(/=|\+|\//gm, '0')
 }
 /**
  * Disconnect from backend service
  */
 _logout () {
     // request for logout
    switch (this._config.method) {
      case 'backend-token':
        fetch(this._config.logoutUrl, 
          {
            method: 'POST',
            headers: {
                  "Authorization": "Bearer " + this.getToken()
            },
            credentials: 'omit'
        }).then((resp) => { this.logout(true)}, (resp) => {this.logout(true)})
        break
      case 'backend-session':
      break
      case 'public':
        var url = this._config.logoutUrl + '?client_id=' + this._config.clientId
        url += '&redirect_uri=' + encodeURIComponent(AuthService._redirectUriLogout)
        this.popup = window.open(url, "_blank", "height=" + AuthService._size.height + ", width=" + AuthService._size.width + ", status=yes, toolbar=no, menubar=no, location=no,addressbar=no");
        var _this = this
        var loop = setInterval(function() {
          if (_this.popup.closed) {
            clearInterval(loop)
            _this.waiting = false
            _this.popup = null
            _this.logout(true)
          }
        })
        break
          
    }
    
 }
 /**
  * @param {window:message} event
  * @listens message
  */
 _receiveMessage (event) {
   if (event.data.code && event.data.state === this._state) {
      this._requestToken(event.data.code)
      if (this._iframe) {
        this._iframe.remove()
        this._iframe = null
      }
   }
   this.waiting = false
 }
 /**
  * Request the endpoints url from an openId SSO
  * @param {string} url - the openid provider url
  */
 _requestOpenidEndpoints (url) {
   this._config.type = 'openid'
   if (url.substr(-1) != '/') {
      url = url + '/'
    }
    url += '/.well-known/openid-configuration'
    fetch(url)
    .then(resp => {return resp.json()}, resp => {this._triggerError('INVALID_OPENID')})
    .then(json => {
      if (json && json.authorization_endpoint) {
       this._config.authUrl = json.authorization_endpoint
       this._config.tokenUrl = json.token_endpoint
       this._config.refreshUrl = json.token_endpoint
       this._config.userinfoUrl = json.userinfo_endpoint
       this._config.logoutUrl = json.end_session_endpoint
      }
    })
}
 /**
  * Update the token or refresh session
  */
 _requestRefreshToken () {
   switch (this._config.method) {
     case 'backend-token':
       fetch(this._config.refreshUrl, {
         headers: {
                'Authorization': 'Bearer ' + this._refreshToken
         },
         credentials: 'omit'
       }).then((resp) => { return resp.json()}, (resp) => {this._resetUser()})
       .then((data) => {
         this._token = data.token || data.access_token
         this._refreshToken = data.refresh_token || this._token
       })
       break
     case 'backend-session':
       break
     case 'public': 
       var postdata = 'refresh_token=' + this._refreshToken
       postdata += '&grant_type=refresh_token'
       postdata += '&client_id=' + this._config.clientId
       postdata += '&redirect_uri=' + encodeURIComponent(AuthService._redirectUri)
       fetch(this._config.refreshUrl, 
        {
          method: 'POST',
          headers: {
                "Content-Type": "application/x-www-form-urlencoded"
          },
          credentials: 'omit',
          body: postdata
       }).then((resp) => { return resp.json()}, (resp) => {this._resetUser()})
       .then((data) => {
         this._token = data.token || data.access_token
         this._refreshToken = data.refresh_token || this._token
      })
      break
   }
 }
 /**
  * Get the access token
  * @param {string} code - the openid code use to get the token
  */
 _requestToken (code) {
      if (this._reject) {
        return
      }
      var body = null
      var headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
      var credentials = 'omit'
      var url = this._config.tokenUrl
      switch (this._config.method) {
        case 'backend-token':
          var data = {
            code: code,
            state: this._state,
            clientId: this._config.clientId,
            redirectUri: AuthService._redirectUri
          }
          headers = {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          }
          body = JSON.stringify(data)
          break
        case 'backend-session':
          credentials = ''
        break
        case 'public':
          body = 'code=' + code
          body += '&grant_type=authorization_code'
          body += '&client_id=' + this._config.clientId
          body += '&redirect_uri=' + encodeURIComponent(AuthService._redirectUri)
          break
      }
      if (this._config.method === 'backend-token') {
        
          
      } else if (this._config.method === 'public') {
          }

      fetch(url, {
          method: 'POST',
          headers: headers,
          credentials: credentials,
          body: body
      })
      .then((resp) => { return resp.json()}, (resp) => {console.log(resp)})
      .then((data) => { this._setToken(data)})
 }
 /**
  * Request the user info
  * @param {callback} resolve
  * @param {callback} reject
  */
 _requestUserInfo (resolve, reject) {
   if (!this._token) {
     return reject('NOT_AUTHENTICATED')
   }
   
   var self = this
   var url = this._config.userinfoUrl
   if (!url) {
     return reject('NO_USERINFO_URL') 
   }
   return fetch(url, {
     headers: {
       'Authorization': 'Bearer ' + this._token
    }
  })
  .then((resp) => {return (resp.json())} , (resp) => {reject(self._identity)})
  .then((json) => {
    if (!self._identity) {
      self._identity = {}
    }
    self._identity = Object.assign(self._identity, json.profile || json)
    resolve(self._identity, self)
  })
 }
 /**
  * Reset the user identity, token ...
  */
 _resetUser () {
   if (this._timer) {
      clearInterval(this._timer)
   }
   this._timer = null
   this._identity = null
   this._expire = null
   this._token = null
   this._refreshToken = null
   if (this._callback.logout) {
    this._callback.logout()
  }
 //  this.logged = false
 }
 /**
  * Record the token and others informations contains in identity token
  * @param {string} data - a jwt token
  */
 _setToken (data) {
      // console.log(data)
      this.waiting = false
//      if (this._timer) {
//        clearInterval(this._timer)
//      }
     
      if (data.token || data.access_token) {
         var self = this
         this._token = data.token || data.access_token
        // this.logged = true
         if (data.refresh_token) {
            this._refreshToken = data.refresh_token
          } else {
            this._refreshToken = this._token
          }
          if (data.id_token || data.token) {
            var obj = data.id_token ? jwt_decode(data.id_token) : jwt_decode(data.token)
            console.log(obj)
            this._identity = obj.data || obj ||  null
            console.log(this._identity)
            if  (this._callback['authenticated']) {
              this._callback['authenticated'](this._identity, this)
              
            }
          } else {
            this._requestUserInfo(self._callback['authenticated'])
          }
          if (obj.exp) {
             var now = new Date()
            console.log(obj.exp)
            this._expire = obj.exp * 1000 - now.getTime()
            if (this._expire > 30 * 60 * 1000) {
              this._expire = 30 * 60 * 1000
            }
          }
          if (data.expires_in) {
            this._expire = data.expires_in * 1000
            
          }
          if (this._expire) {
            this._timer = setInterval(function () {
              self._requestRefreshToken()
            }, this._expire)
          }
      }  else {
        this.logout()
      }   
    }
    _triggerError (name) {
      console.log('Error: ' + name)
      if (this._callback.error) {
        this._callback.error(name)
      }
    }

}
export {AuthService}