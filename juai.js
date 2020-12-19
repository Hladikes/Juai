function Juai(el, model) {
  function directiveModule() {
    // all directives used within an app instance
    let directives = []
  
    return {
      // remove later
      directives,
  
      registerDirective(directive, cb) {
        // Avoid any collision with existing attributes
        if (!directive.includes(':')) throw 'ERR:1'
  
        // REGEX patterns for both directive fragment types
        const PARAM_REGEX = /^\{[a-zA-Z0-9]*\}$/
        const KEYWORD_REGEX = /^[a-zA-Z0-9]*$/
  
        // Check if every fragment of the directive matches speciffic model
        const directiveSplit = directive.split(':')
        let matches = true
        for (let ds of directiveSplit) {
          matches = matches && (
            PARAM_REGEX.test(ds) ||
            KEYWORD_REGEX.test(ds)
          )
        }
  
        if (!matches) throw 'ERR:2'
  
        // Remove template parameters from the curly braces for the comparison
        // Save the parameters names
        let params = []
  
        let directiveTemplate = directive.replace(/\{[a-zA-Z0-9]*\}/g, (g) => {
          params.push(g.replace(/\{|\}/g, ''))
          return '{}'
        })
  
        // Check if such a directive already exist
        let existIndex = directives.findIndex(d => {
          return d.template === directiveTemplate
        })
  
        if (existIndex !== -1) throw 'ERR:3'
  
        let directiveObj = {
          template: directiveTemplate,
          parametricTemplate: directive,
          fragments: directiveSplit,
          length: directiveSplit.length,
          params,
          cb,
          match(rawDirective) {
            // console.time('match')
            let rawDirectiveSplit = rawDirective.split(':')
            let lengthCheck = rawDirectiveSplit.length === this.length
  
            if (!lengthCheck) return false
  
            let paramIndex = 0
            let output = {}
            for (let n = 0; n < this.length; n++) {
              if (PARAM_REGEX.test(this.fragments[n])) {
                if (!rawDirectiveSplit[n]) return false
  
                output[this.params[paramIndex]] = rawDirectiveSplit[n]
                paramIndex++
              } else if (this.fragments[n] !== rawDirectiveSplit[n]) {
                return false
              }
            }
            
            // console.timeEnd('match')
            return output
          }
        }
        
        directives.push(directiveObj)
      },
  
      // Add element parameter for successful match
      encounterDirective(rawDirective, val, el) {
        for (let d of directives) {
          let match = d.match(rawDirective)
          if (match) {
            // console.log('MATCHING', rawDirective, val, el)
            match.$value = val
            d.cb(match, el)
          }
        }
      }
    }
  }

  function evaluateWithContext(expression, context) {
    return eval(`with(context){${expression}}`)
  }

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
  
        set(obj, target, value) {
          if (typeof obj[target] === 'number') value = +value
          obj[target] = value
          cb()
          return true
        }
      })

      for (let property in proxy) {
        if (typeof obj[property] === 'object') {
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
          attrsAsEntries.forEach(a => {
            if (a[0].includes(':')) c.removeAttribute(a[0])
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

  function initializeReactiveDOM(reactiveElements, reactiveTextNodes, context, directivesModule) {
    let bounds = {}

    function addEventTrigger(el, eventName, eventTriggerCode, cb) {
      el.addEventListener(eventName, (event) => {
        if (cb) cb(event)
        if (instance[eventTriggerCode]) {
          instance[eventTriggerCode](event)
        } else {          
          evaluateWithContext(eventTriggerCode, context)
        }
      })
    }

    directivesModule.registerDirective('bind:{boundVariable}', (out, rel) => {
      let boundVariable = out.boundVariable

      if (boundVariable.includes('-')) {
        boundVariable = dashToCamel(boundVariable)
      }

      bounds[boundVariable] = bounds[boundVariable] || []
      bounds[boundVariable].push(rel.element)

      if (rel.element.type === 'checkbox') {            
        rel.element.checked = evaluateWithContext(boundVariable, context)
        addEventTrigger(rel.element, 'input', `${boundVariable} = event.target.checked`)
      } else if (rel.element.type === 'radio') {            
        rel.element.checked = rel.element.value === evaluateWithContext(boundVariable, context)
        addEventTrigger(rel.element, 'input', `${boundVariable} = event.target.value`)
      } else {            
        rel.element.value = evaluateWithContext(boundVariable, context)
        addEventTrigger(rel.element, 'input', `${boundVariable} = event.target.value`)
      }
    })

    directivesModule.registerDirective('on:{event}', (obj, rel) => {
      let eventName = obj.event
      addEventTrigger(rel.element, eventName, obj.$value)
    })


    reactiveElements.forEach(rel => {
      rel.attributes.forEach(relAttr => {
        directivesModule.encounterDirective(relAttr[0], relAttr[1], rel)
      })
    })

    return bounds
  }

  function updateBoundElements(bounds, context) {
    Object.entries(bounds).forEach(bound => {
      bound[1].forEach(boundElement => {
        if (boundElement.type === 'checkbox') {
          boundElement.checked = context[bound[0]]
        } else if (boundElement.type === 'radio') {
          boundElement.checked = boundElement.value === context[bound[0]]
        } else {
          boundElement.value = context[bound[0]]
        }
      })
    })
  }
  
  function registerBuiltinDirectives(directivesModule, context) {
    directivesModule.registerDirective('class:{className}', (obj, rel) => {
      let className = obj.className
      let conditionResult = evaluateWithContext(obj.$value, context)

      if (conditionResult) {
        rel.element.classList.add(className)
      } else {
        rel.element.classList.remove(className)
      }
    })

    directivesModule.registerDirective('is:{state}', (obj, rel) => {
      let state = obj.state
      let conditionResult = evaluateWithContext(obj.$value, context)

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
      } else if (state === 'disabled') {
        if (conditionResult) {
          rel.element.disabled = true
        } else {
          rel.element.removeAttribute('disabled')
        }
      } else if (state === 'enabled') {
        if (conditionResult) {
          rel.element.removeAttribute('disabled')
        } else {
          rel.element.disabled = true
        }
      }
    })
    
    directivesModule.registerDirective('style:{style}', (obj, rel) => {
      let style = obj.style
      let conditionResult = null

      if (style.includes(':')) {
        style = style.split(':')
        let styleProperty = style[0]
        let styleValue = style[1].split('.').join(' ')
        if (obj.$value === '') {
          rel.element.style[styleProperty] = styleValue
        } else {
          conditionResult = evaluateWithContext(obj.$value, context)
          if (conditionResult) {
            rel.element.style[styleProperty] = styleValue
          }
        }
      } else {
        let styleProperty = style
        if (obj.$value.includes('${') && obj.$value.includes('}')) {
          conditionResult = evaluateWithContext(`\`${obj.$value}\``, context)
        } else {
          conditionResult = evaluateWithContext(obj.$value, context)
        }
        rel.element.style[styleProperty] = conditionResult
      }
    })

    directivesModule.registerDirective('dynamic:{attrName}', (obj, rel) => {
      let attrName = obj.attrName
      let conditionResult = evaluateWithContext(obj.$value, context)
      rel.element.setAttribute(attrName, conditionResult)
    })
  }

  function rerenderDOM(reactiveElements, reactiveTextNodes, context, directivesModule) {
    reactiveTextNodes.forEach(rtn => {
      rtn.node.data = rtn.default.replace(/\{\{(.+?)\}\}/g, (match) => {
        return evaluateWithContext(match, context)
      })
    })

    reactiveElements.forEach(rel => {
      rel.attributes.forEach(attr => {
        directivesModule.encounterDirective(attr[0], attr[1], rel)
      })
    })
  }

  const rootElement = document.querySelectorAll(el)[0]
  const reactive = getAllReactiveElements(rootElement)
  const directivesModule = directiveModule()
  const coreDirectivesModule = directiveModule()
  let bounds = {}

  const instance = classToObject(model, () => {
    updateBoundElements(bounds, instance)
    rerenderDOM(reactive.elements, reactive.textNodes, instance, directivesModule)
  })
  
  bounds = initializeReactiveDOM(reactive.elements, reactive.textNodes, instance, coreDirectivesModule)
  registerBuiltinDirectives(directivesModule, instance)
  rerenderDOM(reactive.elements, reactive.textNodes, instance, directivesModule)

  function registerDirective(t, s) {
    directivesModule.registerDirective(t, s)
    rerenderDOM(reactive.elements, reactive.textNodes, instance, directivesModule)
  }

  return {
    directive: registerDirective
  }
}