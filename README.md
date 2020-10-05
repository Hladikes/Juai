# Juai 
## Another javascript frontend framework

## Installation
Put this CDN link into the head of your website
```html
<script src="http://cdn.hldks.net/js/juai.min.js"></script>
```
## Getting started
**HTML**
```html
<body>
  <div id="#app">
    {{ msg }}
  </div>
</body>
```
**JS**
```javascript
class App {
  msg = 'Hello Juai!'
}

Juai('#app', App)
```
### If everything goes well, you should see on your screen text **Hello Juai!**.
As you can see, this code shares some features from Angular and Vue. The feature from angular is that you can write your application as a class where every property is reactive state which can be used in your template and the feature from Vue is that it is very lightweight and easy to use. The only thing we had to done was to call a function **Juai** and pass element and class as arguments
## Data binding
Juai allows you to bind a property to an input element (including select and textarea) so whenever the value in input changes, the new value will be saved in the state to which element is bound to
```html
<p>Your username is {{ username }}</p>
<input type="text" bind:username>

<p>Your age is {{ range }}</p>
<input type="range" bind:range>

<p>Do you agree ? {{ checked ? 'yes' : 'no' }}</p>
<input type="checkbox" bind:checked>

<p>Please select your vehicle. {{ vehicle }}</p>
<select bind:vehicle>
  <option value="car">Car</option>
  <option value="train">Train</option>
</select>
```
```javascript
class App {
  username = ''
  range = 0
  checked = false
  vehicle = ''
}
```
### **If you want to bind an element to value which's name is written in camelCase, you have to write the name of the state in dash-case since HTML is by default using lowercase attributes**
```html
<p>{{ mySuperSecretPassword }}</p>
<input type="text" bind:my-super-secret-password>
```
```javascript
class App {
  mySuperSecretPassword = ''
}
```
## Dynamics
Let's say that you want to change attribute of some element dynamically (based on some state for example). To achieve that, you have to add ```dynamic:``` keyword infront of the attribute. When added, the value of attribute will be evaluated as JavaScript expression within your App context
```html
<input dynamic:type="isPasswordVisible ? 'text' : 'password'">
<input type="checkbox" bind:is-password-visible>
```
You can also make dynamic attribute's value to be a result of a function
```html
<input dynamic:type="inputType()">
<input type="checkbox" bind:is-password-visible>
```
```javascript
class App {
  isPasswordVisible = false

  inputType() {
    return this.isPasswordVisible ? 'text' : 'password'
  }
}
```
## Events
To add an event listener to element, the only thing you have to do is to add keyword ```on:``` following the actual event you want to listen to.
```html
<button on:click="count++">You clicked {{ count }} times</button>
```
```javascript
class App {
  count = 0
}
```
Another example
```html
<div 
  style="height: 50px; width: 50px; background: red"
  on:touchstart="touchStart"
  on:touchend="touchEnd">{{ isTouching }}</div>
```
```javascript
class App {
  isTouching = false
  
  touchStart(event) {
    this.isTouching = true
    console.log(event)
  }

  touchEnd() {
    this.isTouching = false
  }
}
```
The second example is showing the second way you can listen to an event. You can just simply add name of your function in your App as a attribute value and whenever the event occurs, your function will be executed with default event data passed in as an argument
## CSS Classes
Juai allows you to conditionally toggle certain css classes. To achieve that, add to your element keyword ```class:``` following the name of the class. Let's take the second example from events category and take it to the next level!
```css
.green {
  background: green;
}
```
```html
<div 
  style="height: 50px; width: 50px; background: red"
  class:green="isTouching"
  on:touchstart="isTouching = true"
  on:touchend="isTouching = false">{{ isTouching }}</div>
```
```javascript
class App {
  isTouching = false
}
```
### **Keep in mind that currently, with this approach you can't use css class names which are written in camelCase**
## CSS Styles
There are few ways how you can style an element dynamically. The syntax of doing it, is simple. You just add keyword ```style:``` infront of the style property you want to make dynamic and as a value you pass JavaScript expression
```html
<span style:color="'red'">Hello</span>
<span style:color="fontColor">Hello</span>
<span style:border="${borderWidth}px solid red">Hello</span>
```
### **Don't be confused with second and third line of this example. The attributes value will be evaluated as JavaScript expression `as long` as it is not written in template string style. In that case, the value will be evaluated as string**
```javascript
class App {
  fontColor = 'cyan'
  borderWidth = 20
}
```
### Let's make some funny little demo
```html
<div
  style:width="${width}px"
  style:height="${height}px"
  style:background="color"></div>

<input type="range" bind:width min="100" max="300">
<input type="range" bind:height min="100" max="300">
<input type="color" bind:color>
```
```javascript
class App {
  width = 100
  height = 100
  color = 'black'
}
```
## Conditional styles
If (for some unknown reason) you want to conditionally toggle actual styles, you can do so by following this syntax: 
```
style:<style property>:<style value>="<condition>"
style:<style property>:<style value> // Style will be just simply added
```
Example
```html
<span style:color:red="isSomethingTrue()">Hello</span>
<span style:color:green>Hello</span>
<span style:border:2px.solid.yellow="isSomethingTrue()">Hello</span>
<span style:border:6px.solid.red>Hello</span>
```
### **Keep in mind that if you want to add multiple values you have to separate them with dot. The dot acts like space in css**
### **This useless feature also doesn't support values which are comma separated (multiple transitions for example)**
## Conditional showing/hiding
Very simple feature which allows you to conditionally show or hide some element. 
```html
<p is:visible="password.length > 10">Your password is very strong</p>
<p is:hidden="password.length < 11">Your password is very not strong</p>
<input type="password" bind:password>
```
```javascript
class App {
  password = ''
}
```
The `is:visible` and `is:hidden` are basically same things, the only difference is that the expression in `is:hidden` will be negated

# Future
- Add some kind of `v-for` or `ng-for` equivalent
- Add component support
- ~~Make two-way binding work properly~~
- ¯\\_(ツ)_/¯