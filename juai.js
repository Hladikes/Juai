function Juai(el, model) {
  function getAttributes(el) {
    if (el.attributes.length <= 0) return {}
    let attributes = {}
    for (let i = 0; i < el.attributes.length; i++) {
      attributes[el.attributes[i].nodeName] = el.attributes[i].nodeValue
    }
    return attributes
  }

  function dashToCamel(s) {
    return s.replace(/(-[a-zA-Z0-9])/g, (g) => {
      return g.replace('-', '').toUpperCase()
    })
  }

  function classToObject(c, cb) {
    let instance = new c()

    function proxifyObject(obj) {
      const proxy = new Proxy(obj, {
        get() {
          return Reflect.get(...arguments)
        },
  
        set() {
          Reflect.set(...arguments)
          cb()
          return true
        }
      })

      for (let property in proxy) {
        if (typeof obj[property] === 'object' && !obj[property].push) {
          obj[property] = proxifyObject(obj[property])
        }
      }

      return proxy
    }

    return proxifyObject(instance)
  }

  function getAllReactiveElements(element, elements, textNodes) {
    let childs = element.childNodes
    if (childs.length <= 0) return
    elements = elements || []
    textNodes = textNodes || []
    childs.forEach(c => {
      if (c.nodeType === 1) {
        let attrsAsEntries = Object.entries(getAttributes(c))
        if (attrsAsEntries.findIndex(a => a[0].includes(':')) !== -1) {
          elements.push({
            element: c,
            attributes: attrsAsEntries,
            default: c.innerHTML,
            defaultDisplay: element.style.display
          })
        }
      } else if (c.nodeType === 3 && c.data.includes('{{') && c.data.includes('}}')) {
        textNodes.push({
          node: c,
          default: c.data
        })
      }
      if (c.childNodes.length > 0) getAllReactiveElements(c, elements, textNodes)
    })

    return { elements, textNodes }
  }

  function initializeReactiveDOM(reactiveElements, reactiveTextNodes, context) {
    let bounds = {}

    function addEventTrigger(el, eventName, eventTriggerCode, cb) {
      el.addEventListener(eventName, (event) => {
        cb(event)
        if (instance[eventTriggerCode]) {
          instance[eventTriggerCode](event)
        } else {
          eval(`with(context){${eventTriggerCode}}`)
        }
      })
    }

    reactiveElements.forEach(rel => {
      rel.attributes.forEach(relAttr => {
        if (relAttr[0].startsWith('bind:')) {
          let boundVariable = relAttr[0].replace('bind:', '')

          if (boundVariable.includes('-')) {
            boundVariable = dashToCamel(boundVariable)
          }

          bounds[boundVariable] = bounds[boundVariable] || []
          bounds[boundVariable].push(rel.element)

          if (rel.element.type === 'checkbox') {
            rel.element.checked = eval(`with(context){${boundVariable}}`)
            addEventTrigger(rel.element, 'input', `${boundVariable} = event.target.checked`, (event) => {
              bounds[boundVariable].forEach(boundEl => {
                if (rel !== boundEl) {
                  boundEl.checked = event.target.checked
                }
              })
            })
          } else if (rel.element.type === 'radio') {
            rel.element.checked = rel.element.value === eval(`with(context){${boundVariable}}`)
            addEventTrigger(rel.element, 'input', `${boundVariable} = event.target.value`, (event) => {
              bounds[boundVariable].forEach(boundEl => {
                if (rel !== boundEl) {
                  boundEl.checked = event.target.value === boundEl.value
                }
              })
            })
          } else {
            rel.element.value = eval(`with(context){${boundVariable}}`)
            addEventTrigger(rel.element, 'input', `${boundVariable} = event.target.value`, (event) => {
              bounds[boundVariable].forEach(boundEl => {
                if (rel !== boundEl) {
                  boundEl.value = event.target.value
                }
              })
            })
          }
        }

        if (relAttr[0].startsWith('on:')) {
          let eventName = relAttr[0].replace('on:', '')
          addEventTrigger(rel.element, eventName, relAttr[1])
        }
      })
    })
  }
  
  function rerenderDOM(reactiveElements, reactiveTextNodes, context) {
    reactiveTextNodes.forEach(rtn => {
      rtn.node.data = rtn.default.replace(/\{\{(.+?)\}\}/g, (match) => {
        return eval(`with(context){${match}}`)
      })
    })

    reactiveElements.forEach(rel => {
      rel.attributes.forEach(attr => {
        if (attr[0].startsWith('class:')) {
          let className = attr[0].replace('class:', '')
          let conditionResult = eval(`with(context){${attr[1]}}`)

          if (conditionResult) {
            rel.element.classList.add(className)
          } else {
            rel.element.classList.remove(className)
          }
        }

        if (attr[0].startsWith('is:')) {
          let state = attr[0].replace('is:', '')
          let conditionResult = eval(`with(context){${attr[1]}}`)

          if (state === 'visible') {
            if (conditionResult) {
              rel.element.style.display = rel.defaultDisplay
            } else {
              rel.element.style.display = 'none'
            }
          } else if (state === 'hidden') {
            if (conditionResult) {
              rel.element.style.display = 'none'
            } else {
              rel.element.style.display = rel.defaultDisplay
            }
          }
        }

        if (attr[0].startsWith('style:')) {
          let style = attr[0].replace('style:', '')
          let conditionResult = null

          if (style.includes(':')) {
            style = style.split(':')
            let styleProperty = style[0]
            let styleValue = style[1].split('.').join(' ')
            if (attr[1] === '') {
              rel.element.style[styleProperty] = styleValue
            } else {
              conditionResult = eval(`with(context){${attr[1]}}`)
              if (conditionResult) {
                rel.element.style[styleProperty] = styleValue
              }
            }
          } else {
            let styleProperty = style
            if (attr[1].includes('${') && attr[1].includes('}')) {
              conditionResult = eval(`with(context){\`${attr[1]}\`}`)
            } else {
              conditionResult = eval(`with(context){${attr[1]}}`)
            }
            rel.element.style[styleProperty] = conditionResult
          }
        }

        if (attr[0].startsWith('dynamic:')) {
          let attrName = attr[0].replace('dynamic:', '')
          let conditionResult = eval(`with(context){${attr[1]}}`)
          rel.element.setAttribute(attrName, conditionResult)
        }
      })
    })
  }

  const rootElement = document.querySelectorAll(el)[0]
  const reactive = getAllReactiveElements(rootElement)
  const instance = classToObject(model, () => {
    rerenderDOM(reactive.elements, reactive.textNodes, instance)
  })

  rerenderDOM(reactive.elements, reactive.textNodes, instance)
  initializeReactiveDOM(reactive.elements, reactive.textNodes, instance)
}