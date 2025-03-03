/* global fetch */

const html = require('choo/html')
const Component = require('choo/component')
const nanostate = require('nanostate')
const nanologger = require('nanologger')
const logger = nanologger('authorize')

class Authorize extends Component {
  constructor (id, state, emit) {
    super(id)

    this.emit = emit
    this.state = state

    this.local = state.components[id] = Object.create({
      machine: nanostate.parallel({
        request: nanostate('idle', {
          idle: { start: 'loading' },
          loading: { resolve: 'data', reject: 'error', reset: 'idle' },
          data: { reset: 'idle', start: 'loading' },
          error: { reset: 'idle', start: 'loading' }
        }),
        loader: nanostate('off', {
          on: { toggle: 'off' },
          off: { toggle: 'on' }
        })
      })
    })

    this.local.error = {}

    this.local.machine.on('request:error', () => {
      if (this.element) this.rerender()
    })

    this.local.machine.on('request:loading', () => {
      if (this.element) this.rerender()
    })

    this.local.machine.on('loader:toggle', () => {
      if (this.element) this.rerender()
    })

    this.local.machine.on('request:error', () => {
      if (this.element) this.rerender()
    })

    this.local.machine.transitions.request.event('error', nanostate('error', {
      error: { start: 'loading' }
    }))

    this.local.machine.on('request:noResults', () => {
      if (this.element) this.rerender()
    })

    this.local.machine.transitions.request.event('noResults', nanostate('noResults', {
      noResults: { start: 'loading' }
    }))
  }

  createElement (props) {
    const input = (props) => {
      const attrs = Object.assign({
        type: 'submit',
        name: 'continue',
        class: 'bg-white black ba bw b--dark-gray f5 b pv3 ph3 grow',
        value: 'Continue'
      }, props)

      return html`
        <input ${attrs}>
      `
    }

    const attrs = {
      novalidate: 'novalidate',
      class: 'flex flex-column flex-auto ma0 pa0',
      action: '',
      method: 'POST',
      onsubmit: async (e) => {
        e.preventDefault()

        if (this.local.machine.state === 'loading') {
          return
        }

        const loaderTimeout = setTimeout(() => {
          this.local.machine.emit('loader:toggle')
        }, 1000)

        try {
          this.local.machine.emit('request:start')

          let response = await fetch('')

          const csrfToken = response.headers.get('X-CSRF-Token')

          const { name = 'continue', value = 'Continue' } = e.submitter // may need polyfill for edge ?

          response = await fetch('', {
            method: 'POST',
            credentials: 'include',
            headers: {
              Accept: 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: new URLSearchParams({
              [name]: value
            })
          })

          this.local.machine.state.loader === 'on' && this.local.machine.emit('loader:toggle')

          const contentType = response.headers.get('content-type')

          if (response.status >= 400 && contentType && contentType.indexOf('application/json') !== -1) {
            const { error } = await response.json()
            this.local.error.message = error
            return this.local.machine.emit('request:error')
          }

          this.local.machine.emit('request:resolve')

          if (response.redirected) {
            window.location.href = response.url
          }
        } catch (err) {
          logger.error(err.message)
          this.local.error.message = err.message
          this.local.machine.emit('request:reject')
          this.emit('error', err)
        } finally {
          clearTimeout(loaderTimeout)
        }
      }
    }

    return html`
      <div class="flex flex-column flex-auto">
        <form ${attrs}>
          <div class="flex flex-column">
            <p>To continue to the <b>${this.state.applicationName}</b>, please confirm the action.</p>
          </div>
          <div class="flex">
            <div class="mr2">
              ${input({
                name: 'continue',
                value: 'Continue'
              })}
            </div>
            <div>
              ${input({
                name: 'cancel',
                class: 'bg-transparent white bn f5 b pv3 ph3 grow',
                value: 'Cancel'
              })}
            </div>
          </div>
        </form>
      </div>
    `
  }

  update () {
    return false
  }
}

module.exports = Authorize
