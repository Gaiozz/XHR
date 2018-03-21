const XHRStatus = {
    SUCCESS: 1,
    ERROR: 2,
    ABORT: 3
}

class XHR {
    constructor ({ url, type, data, contentType, reqHeaders, onSuccess, onFail, onAbort, sendImmediately = true } = null) {
        if (typeof arguments[0] != 'object') {
            url = arguments[0]

            switch (typeof arguments[1]) {
                case 'string': {
                    type = arguments[1]

                    if (typeof arguments[2] == 'object') {
                        data = arguments[2]
                        onSuccess = arguments[3]
                        onFail = arguments[4]
                    }
                    else {
                        onSuccess = arguments[2]
                        onFail = arguments[3]
                    }
                    break
                }
                case 'object': {
                    data = arguments[1]
                    onSuccess = arguments[2]
                    onFail = arguments[3]
                    break
                }
                case 'function': {
                    onSuccess = arguments[1]
                    onFail = arguments[2]
                    break
                }
            }
        }

        this.url = url
        this.type = type || 'GET'
        this.data = data || null

        this.reqHeaders = reqHeaders || {}

        this.onSuccess = onSuccess
        this.onFail = onFail
        this.onAbort = onAbort

        this.requestHolder = null

        if (sendImmediately) this.Send(this.data)
    }

    _CreateRequest () {
        this.requestHolder = new XMLHttpRequest()
        this.requestHolder.addEventListener('abort', ev => {
            XHR._OnComplete(XHRStatus.ABORT)

            if (typeof this.onAbort === 'function') this.onAbort()
        })
        this.requestHolder.onreadystatechange = (ev) => {
            if (ev.target.readyState !== 4) return

            if (ev.target.status === 200) {
                let resp = null
                if (!!ev.target.response && typeof ev.target.response === 'string') {
                    try {
                        resp = JSON.parse(ev.target.response)
                    }
                    catch (err) {
                        resp = ev.target.response
                    }
                }

                XHR._OnComplete(XHRStatus.SUCCESS, resp)

                if (typeof this.onSuccess === 'function') {
                    this.onSuccess(resp, this.requestHolder)
                }
            }
            else {
                let statusCode = ev.target.status

                XHR._OnComplete(XHRStatus.SUCCESS, statusCode)

                if (typeof this.onFail === 'function') this.onFail(statusCode)
            }
        }
    }

    Send (data) {
        if (this.requestHolder == null) this._CreateRequest()

        this.requestHolder.open(this.type, this.url, true)
        for (let x in this.reqHeaders) {
            if (!this.reqHeaders.hasOwnProperty(x)) continue
            this.requestHolder.setRequestHeader(x, this.reqHeaders[x])
        }

        this.requestHolder.send(data)
    }

    Abort () {
        this.requestHolder.abort()
    }

    static _OnComplete (status, resp = null) {
        XHR.emitter.emit('complete', status, resp)
    }

    static CombineGetRequests (urls, callback) {
        var counter = 0
        var responses = []

        urls.forEach(url => {
            new XHR({
                url,
                onSuccess: (resp) => {
                    responses[urls.indexOf(url)] = resp
                    counter++
                    if (counter === urls.length) callback(...responses)
                },
                onFail: () => {
                    responses[urls.indexOf(url)] = null
                    counter++
                    if (counter === urls.length) callback(...responses)
                },
                onAbort: () => {
                    responses[urls.indexOf(url)] = null
                    counter++
                    if (counter === urls.length) callback(...responses)
                }
            })
        })
    }
}
