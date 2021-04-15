# JS_UI_Utils
Some flexible js tools for optimal event dispatchers for objects, basic state management and subscribing, and easy document fragment rendering/scripting.

There are three main classes in UI_Utils.js: ObjectListener, DOMFragment, and StateManager which have simple and complex usage possibilities. Use this to create optimal UI rendering and event dispatching loops. I based a ton of features for [app.brainsatplay.com](app.brainsatplay.com) (formerly [webbci.netlify.app](webbci.netlify.app)) on these scripts to make a cool modular UI with applets and really optimal rendering as it's also handling device streams and real time signal analysis.

If you want to use these in an html file use these in a module script or delete the exports and load the script before/after your main script in the html file.

FYI Read the classes as there are a lot of functions not documented here, these are just the most straightforward usages and you don't need the rest.

### StateManager Usage
```
const State = new StateManager({
  x:0,
  y:[],
  z:{w:3}
});

let sub1 = State.subscribe('y',(newy)=>{
  console.log('new y:',newy);
});

// ... later ...   
State.unsubscribe('y',sub1);
```
The state manager is mostly a wrapper for ObjectListener to make it easy to create and subcribe/unsubscribe to keyed values in the state. You can monitor any JSONifiable values/arrays/objects for changes, as well as functions. 

Circular references and large arrays (including arrays 1 layer deep in a nested object) are automatically optimized so the event loop doesn't waste resources to look for updates. Subscriptions fire whenever a value is updated, multiple subscriptions are tied to the same event loop and are referenced by the return subscription value for unsubscribing later.

### DOMFragment usage
```
let htmlprops = {
  id:'template1'
};

function templateStringGen(props) {
    return `
    <div id=${props.id}>Clickme</div>
    `;
}

function onRender() {
    document.getElementById(htmlprops.id).onclick = () => { 
      document.getElementById(htmlprops.id).innerHTML = "Clicked!"; 
    }
}

function onChange() {
  console.log('props changed!');
}

const fragment = new DOMFragment(
                        templateStringGen,
                        document.body,
                        htmlprops,
                        onRender,
                        undefined, //onChange
                        "NEVER" //"FRAMERATE" //1000
                      ); 
```
DOMFragment objects let you specify a template string or template string-returning function with properties to be rendered as a document fragment to the specified DOMElement node or div id string. 

You can specify a properties object and an onRender function. onRender is used to wire up the UI logic like adding functions to buttons. 

The properties are only specified if your template string generator function requires them, otherwise leave undefined. You can also specify an onChange function and set an update interval for the DOMFragment to be re-rendered if a change is detected in the properties or template string. Don't use this unless you need to re-render the *entire* node, otherwise just manipulate the divs normally.

If the interval is set to "NEVER" (it is by default), no state monitoring or automatic updating will be created which is fine for rendering quick fragments and manipulating them externally - which I do most often with this. "FRAMERATE" will follow your refresh rate, otherwise it can be set to any millisecond value. You can still create keys in its internal object listener (this.listener.addListener(key,object,property) to make responsive elements without completely re-rendering a node if you want to keep everything contained. This makes for a flexible and optimal rendering tool with optional internal state management.

### ObjectListener usage
```
//Example:
let events = new ObjectListener();
let x = { y: 1, z: { w: 2 }}


events.addListener("y",x,"y");
events.addListener("z",x,"z");

//events.addListener(key,object,property,onchange,interval,debug)

x.z.w = 3;
x.y = 2;
//See console
events.remove("y");
events.remove("z");

```

Straightforward event listener for generic javascript objects. Allows you to assign 'ObjectListenerInstance'  objects to specified properties. Those properties can have as many different functions added to them as you want for keying responses in different parts of your UI or across scripts if you export the listener/state.

the addListener function wants a custom key string, the object you want to monitor, the object property (string) you want to monitor (leave undefined to monitor the whole object), and also lets you specify an update interval as well as some debug information. The interval is by default "FRAMERATE" which ties it to a requestAnimationFrame loop. You can also set it to any millisecond value.

If you are monitoring large arrays their references are automatically sliced in the listeners for speed. if you are watching an object, it will use slices, and it can slice the arrays one level down in nested objects as well (so one object deeper) but no more.



