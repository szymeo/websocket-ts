"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Websocket = exports.WebsocketEvents = void 0;
var WebsocketEvents;
(function (WebsocketEvents) {
    WebsocketEvents["open"] = "open";
    WebsocketEvents["close"] = "close";
    WebsocketEvents["error"] = "error";
    WebsocketEvents["message"] = "message";
    WebsocketEvents["retry"] = "retry"; // A try to re-connect is made
})(WebsocketEvents = exports.WebsocketEvents || (exports.WebsocketEvents = {}));
var Websocket = /** @class */ (function () {
    function Websocket(url, protocols, buffer, backoff) {
        var _this = this;
        this.eventListeners = { open: [], close: [], error: [], message: [], retry: [] };
        this.closedByUser = false;
        this.retries = 0;
        this.handleOpenEvent = function (ev) { return _this.handleEvent(WebsocketEvents.open, ev); };
        this.handleCloseEvent = function (ev) { return _this.handleEvent(WebsocketEvents.close, ev); };
        this.handleErrorEvent = function (ev) { return _this.handleEvent(WebsocketEvents.error, ev); };
        this.handleMessageEvent = function (ev) { return _this.handleEvent(WebsocketEvents.message, ev); };
        this.url = url;
        this.protocols = protocols;
        this.buffer = buffer;
        this.backoff = backoff;
        this.tryConnect();
    }
    Object.defineProperty(Websocket.prototype, "underlyingWebsocket", {
        get: function () {
            return this.websocket;
        },
        enumerable: false,
        configurable: true
    });
    Websocket.prototype.send = function (data) {
        var _a;
        if (this.closedByUser)
            return;
        if (this.websocket === undefined || this.websocket.readyState !== this.websocket.OPEN)
            (_a = this.buffer) === null || _a === void 0 ? void 0 : _a.write([data]);
        else
            this.websocket.send(data);
    };
    Websocket.prototype.close = function (code, reason) {
        var _a;
        this.closedByUser = true;
        (_a = this.websocket) === null || _a === void 0 ? void 0 : _a.close(code, reason);
    };
    Websocket.prototype.open = function () {
        this.closedByUser = false;
        this.tryConnect();
    };
    Websocket.prototype.addEventListener = function (type, listener, options) {
        var eventListener = { listener: listener, options: options };
        var eventListeners = this.eventListeners[type];
        eventListeners.push(eventListener);
    };
    Websocket.prototype.removeEventListener = function (type, listener, options) {
        this.eventListeners[type] =
            this.eventListeners[type]
                .filter(function (l) {
                return l.listener !== listener && (l.options === undefined || l.options !== options);
            });
    };
    Websocket.prototype.dispatchEvent = function (type, ev) {
        var _this = this;
        var listeners = this.eventListeners[type];
        var onceListeners = [];
        listeners.forEach(function (l) {
            l.listener(_this, ev); // call listener
            if (l.options !== undefined && l.options.once)
                onceListeners.push(l);
        });
        onceListeners.forEach(function (l) { return _this.removeEventListener(type, l.listener, l.options); }); // remove 'once'-listeners
    };
    Websocket.prototype.tryConnect = function () {
        if (this.websocket !== undefined) { // remove all event-listeners from broken socket
            this.websocket.removeEventListener(WebsocketEvents.open, this.handleOpenEvent);
            this.websocket.removeEventListener(WebsocketEvents.close, this.handleCloseEvent);
            this.websocket.removeEventListener(WebsocketEvents.error, this.handleErrorEvent);
            this.websocket.removeEventListener(WebsocketEvents.message, this.handleMessageEvent);
            this.websocket.close();
        }
        this.websocket = new WebSocket(this.url, this.protocols); // create new socket and attach handlers
        this.websocket.addEventListener(WebsocketEvents.open, this.handleOpenEvent);
        this.websocket.addEventListener(WebsocketEvents.close, this.handleCloseEvent);
        this.websocket.addEventListener(WebsocketEvents.error, this.handleErrorEvent);
        this.websocket.addEventListener(WebsocketEvents.message, this.handleMessageEvent);
    };
    Websocket.prototype.handleEvent = function (type, ev) {
        var _a, _b, _c;
        switch (type) {
            case WebsocketEvents.close:
                if (!this.closedByUser) // failed to connect or connection lost, try to reconnect
                    this.reconnect();
                break;
            case WebsocketEvents.open:
                this.retries = 0;
                (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.reset(); // reset backoff
                (_b = this.buffer) === null || _b === void 0 ? void 0 : _b.forEach(this.send.bind(this)); // send all buffered messages
                (_c = this.buffer) === null || _c === void 0 ? void 0 : _c.clear();
                break;
        }
        this.dispatchEvent(type, ev); // forward to all listeners
    };
    Websocket.prototype.reconnect = function () {
        var _this = this;
        if (this.backoff === undefined) // no backoff, we're done
            return;
        var backoff = this.backoff.next();
        setTimeout(function () {
            _this.dispatchEvent(WebsocketEvents.retry, new CustomEvent(WebsocketEvents.retry, {
                detail: {
                    retries: ++_this.retries,
                    backoff: backoff
                }
            }));
            _this.tryConnect();
        }, backoff);
    };
    return Websocket;
}());
exports.Websocket = Websocket;
//# sourceMappingURL=websocket.js.map