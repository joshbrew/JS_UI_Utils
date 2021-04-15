
/*
//Example:
let events = new ObjectListener();
let x = { y: 1, z: { w: 2 }}


events.addListener("y",x,"y");
events.addListener("z",x,"z");

x.z.w = 3;
x.y = 2;
//See console

*/

//By Joshua Brewster (MIT)

//Create instance and then call instance.addListener(listenerName,objectToListenTo,propToListenTo,onchange,interval).
//name, propToListenTo, onchange, and interval are optional (leave or set as undefined). Onchange is a custom callback just like for other event listeners. Set a name to make it easier to start and stop or edit each listener.
export class ObjectListener {
    constructor(debug=false) {
        this.debug = debug;
        this.listeners = [];
    }

    //add a new object listener with specified props (or none to watch the whole object), and onchange functions, with optional interval
    addListener(listenerKey=null,objectToListenTo,propToListenTo=undefined,onchange=undefined,interval=undefined,debug=this.debug) {
        if(objectToListenTo === undefined) {
            console.error("You must assign an object");
            return;
        }

        var key = listenerKey;
        if(key === null) {
            key = Math.floor(Math.random()*100000);
        }
        var listener = {key:key, listener: new ObjectListenerInstance(objectToListenTo,propToListenTo,onchange,interval,debug)};
        this.listeners.push(listener);
    }

    hasKey(key) {
        var found = false;
        this.listeners.forEach((item,i) =>{
            if(item.key === key) {found = true;}
        });
        return found;
    }

    getKeyIndices(key) {
        var indices = [];
        this.listeners.find((o,i) => {
            if(o.key === key) {
                indices.push(i);
            }
        });
        return indices;
    }

    onchange(key=null,newCallback=null){
        if(key === null) {
            this.listeners.forEach((obj,i) => {
                obj.listener.onchange = newCallback;
            });
        }
        else {
            var found = this.listeners.find((o,i) => {
                if(o.name === key) {
                    o.listener.onchange = newCallback;
                }
            });
        }
    }

    //Add extra onchange functions
    addFunc = (key=null,newCallback=null) => {
        var callbackIdx = null;
        if(newCallback !== null){
            if(key === null) {
                this.listeners.forEach((obj,i) => {
                    callbackIdx = obj.listener.addFunc(newCallback);
                });
            }
            else {
                var found = this.listeners.find((o,i) => {
                    if(o.key === key) {
                        callbackIdx = o.listener.addFunc(newCallback);
                    }
                });
            }
        }
        return callbackIdx;
    }

    //Remove extra onchange functions
    removeFuncs = (key = null, idx = null) => {
        if(key === null) {
            this.listeners.forEach((obj,i) => {
                obj.listener.removeFuncs(idx);
            });
        }
        else {
            var found = this.listeners.find((o,i) => {
                if(o.name === key) {
                    o.listener.removeFuncs(idx);
                }
            });
        }
    }

    //Stop all or named listeners
    stop(key=null) {
        if(key === null) {
            this.listeners.forEach((obj,i) => {
                obj.listener.stop();
            });
        }
        else {
            var found = this.listeners.find((o,i) => {
                if(o.name === key) {
                    o.listener.stop();
                }
            });
        }
    }

    //Restart all or named listeners
    start(key=null) {
        if(key === null) {
            this.listeners.forEach((obj,i) => {
                obj.listener.start();
            });
        }
        else {
            var found = this.listeners.find((o,i) => {
                if(o.name === key) {
                    o.listener.start();
                }
            });
        }
    }

    remove(key=null){
        if(key === null) {
            this.listeners.splice(0,this.listeners.length);
        }
        else {
            var indices = [];
            var found = this.listeners.find((o,i) => {
                if(o.name === key) {
                    indices.push(i);
                }
            });
            indices.reverse().forEach((idx) => {
                this.listeners[idx].stop();
                this.listeners.splice(idx,1);
            });
        }
    }
}

//Instance of an object listener. This will subscribe to object properties (or whole objects) and run attached functions when a change is detected.
export class ObjectListenerInstance {
    constructor(object,propName="__ANY__",onchange=this.onchange,interval="FRAMERATE",debug=false) {
        this.debug=debug;

        this.onchange = onchange; //Main onchange function
        this.onchangeFuncs = []; //Execute extra functions pushed to this array

        this.object = object; //Objects are always passed by reference
        this.propName = propName;
        this.propOld = undefined;
        this.setListenerRef(propName);

        this.running = true;


        this.interval;
        if(interval <= 0) {
            this.interval = 10; console.log("Min recommended interval set: 10ms");}
        else {
            this.interval = interval;
        }
        this.checker = requestAnimationFrame(this.check);

    }

    //Main onchange execution
    onchange = (newData) => {
        console.log(this.propName," changed from: ", this.propOld," to: ", this.object[this.propName]);
    }

    //Add extra onchange functions for execution
    addFunc = (onchange=null) => {
        if(onchange !== null){
            this.onchangeFuncs.push(onchange);
        }
        return this.onchangeFuncs.length-1;
    }

    //Remove extra onchange functions
    removeFuncs(idx = null) {
        if(idx === null) {
            this.onchangeFuncs = [];
        }
        else if(this.onchangeFuncs[idx] !== undefined) {
            this.onchangeFuncs.splice(idx,1);
        }
    }

    //Execute extra onchange functions
    onchangeMulti = (newData) => {
        this.onchangeFuncs.forEach((func,i) => {
            if(this.debug === true) { console.log(func); }
            func(newData);
        });
    }

    //Update listener reference copy.
    setListenerRef = (propName) => {
        if(propName === "__ANY__" || propName === null || propName === undefined) {
            this.propOld = JSON.stringifyFast(this.object);
        }
        else if(Array.isArray(this.object[propName])) {
            this.propOld = JSON.stringifyFast(this.object[propName].slice(this.object[propName].length-20));
        }
        else if(typeof this.object[propName] === "object"){
            this.propOld = JSON.stringifyFast(this.object[propName]);
        }
        else if(typeof this.object[propName] === "function"){
            this.propOld = this.object[propName].toString();
        }
        else{
            this.propOld = this.object[propName]; //usually a number, bool, or string;
        }
        
        if(this.debug === true) { console.log("propname", propName, ", new assignment: ", this.propOld); }
    }

    check = () => {
        if(this.propName === "__ANY__" || this.propName === null || this.propName === undefined){
            if(this.propOld !== JSON.stringifyFast(this.object)){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object);
                if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object); }
                this.setListenerRef(this.propName);
            }
        }
        else if(Array.isArray(this.object[this.propName])) { //cut arrays down for speed
            if(this.propOld !== JSON.stringifyFast(this.object[this.propName].slice(this.object[this.propName].length-20))){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object[this.propName]);
                if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object[this.propName]); }
                this.setListenerRef(this.propName);
            }
        }
        else if(typeof this.object[this.propName] === "object") {
            let string = JSON.stringifyFast(this.object[this.propName]);
            if(this.propOld !== string){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object[this.propName]);
                if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object[this.propName]); }
                this.setListenerRef(this.propName);
            }
        }
        else if(typeof this.object[this.propName] === "function") {
            if(this.propOld !== this.object[this.propName].toString()){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object[this.propName].toString());
                if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object[this.propName].toString()); }
                this.setListenerRef(this.propName);
            }
        }
        else if(this.object[this.propName] !== this.propOld) {
            if(this.debug === true) { console.log("onchange: ", this.onchange); }
            this.onchange(this.object[this.propName]);
            if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object[this.propName]); }
            this.setListenerRef(this.propName);
        }
        
        if(this.running === true) {
            if(this.debug === true) {console.log("checking", this.object, this.propName);}
            if(this.interval === "FRAMERATE"){
                this.checker = requestAnimationFrame(this.check);
            }
            else {
                setTimeout(()=>{this.check},this.interval);
            }
        };
    }

    start() {
        this.running = true;
        this.checker = requestAnimationFrame(this.check);
    }

    stop() {
        this.running = false;
        cancelAnimationFrame(this.checker);
    }

}


//This only really matters in Chrome and one other browser
export function sortObjectByValue(object) { //Sorts number and string objects by numeric value. Strings have charcodes summed for comparison. Objects and functions are stringified.
    var sortable = [];
    for(var prop in object) {
        sortable.push([prop, object[prop]]);
    }

    sortable.sort(function(a,b) {
        var prop1 = a;
        var prop2 = b;
        if(typeof prop1[1] === "function"){
            prop1[1] = prop1[1].toString();
        }
        else if(typeof prop1[1] === "object"){
            prop1[1] = JSON.stringifyFast(prop1[1]);
        }
        if(typeof prop2[1] === "function"){
            prop2[1] = prop2[1].toString();
        }
        else if(typeof prop2[1] === "object"){
            prop2[1] = JSON.stringifyFast(prop2[1]);
        }
        
        if(typeof prop1[1] === "string") {
            var temp = 0;
            prop1.forEach((char,i) => {
                temp += prop1.charCodeAt(i);
            });
            prop1 = temp;
        }
        if(typeof prop2[1] === "string") {
            var temp = 0;
            prop2.forEach((char,i) => {
                temp += prop2.charCodeAt(i);
            });
            prop2 = temp;
        }
        return prop1[1]-prop2[1];
    });

    var sorted = {};

    sortable.forEach((item) => {
       sorted[item[0]]=item[1];
    });

    return sorted;

}

export function sortObjectByPropName(object) {

    var sortable = [];

    for(var prop in object) {
        sortable.push([prop, object[prop]]);
    }

    sortable.sort(function(a,b) {
        return a[0] > b[0];
    });

    var sorted = {};

    sortable.forEach((item) => {
        sorted[item[0]]=item[1];
    });

    return sorted;

}

//modified to also cut down the size arrays for faster looping
if(JSON.stringifyFast === undefined) {
    //Workaround for objects containing DOM nodes, which can't be stringified with JSON. From: https://stackoverflow.com/questions/4816099/chrome-sendrequest-error-typeerror-converting-circular-structure-to-json
    JSON.stringifyFast = (function() {
        const refs = new Map();
        const parents = [];
        const path = ["this"];

        function clear() {
            refs.clear();
            parents.length = 0;
            path.length = 1;
        }

        function updateParents(key, value) { //for json.parse
            var idx = parents.length - 1;
            var prev = parents[idx];
            if (prev[key] === value || idx === 0) {
                path.push(key);
                parents.push(value);
            } else {
                while (idx-- >= 0) {
                    prev = parents[idx];
                    if (prev[key] === value) {
                        idx += 2;
                        parents.length = idx;
                        path.length = idx;
                        --idx;
                        parents[idx] = value;
                        path[idx] = key;
                        break;
                    }
                }
            }
        }

        function checkValues(key, value) {
            let val = value;
            if (val !== null) {
                if (typeof value === "object") {
                    //if (key) { updateParents(key, value); }
                    let other = refs.get(val);
                    let c = value.constructor.name;
                    if (other) {
                        return '[Circular Reference]' + other;
                    } else if(c === "Array" && value.length > 20) { //Cut arrays down to 100 samples for referencing
                        val = value.slice(value.length-20);
                        refs.set(val, path.join('.'));
                    } else if (c !== "Object" && c !== "Number" && c !== "String" && c !== "Boolean") { //simplify classes, objects, and functions, point to nested objects for the state manager to monitor those properly
                        val = "instanceof_"+c;
                        refs.set(val, path.join('.'));
                    } else if (typeof val === 'object') {
                        let obj = {};
                        for(const prop in val) {
                            if(Array.isArray(val[prop])) { obj[prop] = val[prop].slice(val[prop].length-20); } //deal with arrays in nested objects (e.g. means, slices)
                            else { obj[prop] = val[prop]; }
                        }
                    }
                    else {
                        refs.set(val, path.join('.'));
                    }
                }
            }
            return val;
        }

        return function stringifyFast(obj, space) {
            try {
                parents.push(obj);
                return JSON.stringify(obj, checkValues, space);
            } finally {
                clear();
            }
        }
    })();
}


//By Joshua Brewster (MIT)

/* 
const htmlprops;

function templateStringGen(props) {
    return `
    <div id=`+props.id+`>Clickme</div>
    `;
}

function onRender() {
    document.getElementById(htmlprops.id).onclick = () => { document.getElementById(htmlprops.id).innerHTML = "Clicked!"; }
}

const fragment = new DOMFragment(templateStringGen,document.body,htmlprops,onRender,undefined,"NEVER"); 
//Renders a static DOM fragment to the given parent node. 
// Change propUpdateInterval to "FRAMERATE" or any millisecond value and add an 
// onchange function to have the html re-render when the props update and have an 
// additional function fire.

*/

export class DOMFragment {
    /**
     * @constructor
     * @alias DOMFragment
     * @description Create a DOM fragment.
     * @param {function} templateStringGen - Function to generate template string.
     * @param {HTMLElement} parentNode HTML DOM node to append fragment into.
     * @param {callback} onRender Callback when element is rendered.
     * @param {callback} onchange Callback when element is changed.
     * @param {int} propUpdateInterval How often to update properties.
     */
    constructor(templateStringGen=this.templateStringGen, parentNode=document.body, props={}, onRender=()=>{}, onchange=()=>{}, propUpdateInterval="NEVER") {
        this.onRender = onRender;
        
        this.parentNode = parentNode;
        if(typeof parentNode === "string") {
            this.parentNode = document.getElementById(parentNode);
        }
        this.renderSettings = {
            templateStringGen: templateStringGen,
            onchange: onchange,
            props: props
        }
        this.templateString = ``;
        if(typeof templateStringGen === 'function') {
            this.templateString = templateStringGen(props);
        }
        else {
            this.templateString = templateStringGen;
        }
        
        var interval = propUpdateInterval;
        if(this.renderSettings.props === {}) {interval = "NEVER";}
        this.node = null;

        this.listener = new ObjectListener();
    
        if((Object.keys(this.renderSettings.props).length > 0) && !(interval === null || interval === undefined || interval === "NEVER")) {
            console.log("making listeners for ", templateStringGen)

            const templateChange = () => {
                this.updateNode();
            }

            this.listener.addListener(
                'templateChange',
                this.renderSettings,
                'templateStringGen',
                templateChange, 
                interval
                );

            const propsChange = () => {
                this.updateNode();
                this.renderSettings.onchange();
            }

            this.listener.addListener(
                'props',
                this.renderSettings,
                'props',
                propsChange, 
                interval
            );
        }
      
        this.renderNode();
    }

    onRender = () => {}

    //appendId is the element Id you want to append this fragment to
    appendFragment(HTMLtoAppend, parentNode) {
        var template = document.createElement('template');
        template.innerHTML = HTMLtoAppend;
        var fragment = template.content;
        parentNode.appendChild(fragment);
        return parentNode.children[parentNode.children.length-1];
    }
  
    //delete selected fragment. Will delete the most recent fragment if Ids are shared.
    deleteFragment(parentNode,nodeId) {
        var node = document.getElementById(nodeId);
        parentNode.removeChild(node);
    }
  
    //Remove Element Parent By Element Id (for those pesky anonymous child fragment containers)
    removeParent(elementId) {
        // Removes an element from the document
        var element = document.getElementById(elementId);
        element.parentNode.parentNode.removeChild(element.parentNode);
    }

    renderNode(parentNode=this.parentNode){
        this.node = this.appendFragment(this.templateString,parentNode);
        this.onRender();
    }

    updateNode(parentNode=this.parentNode, node=this.node, props=this.props){
        parentNode.removeChild(node);
        if(typeof this.renderSettings.templateStringGen === 'function') {
            this.templateString = this.renderSettings.templateStringGen(this.props);
        }
        else {
            this.templateString = this.renderSettings.templateStringGen;
        }
        this.renderNode(parentNode, props);
    }

    deleteNode(node=this.node) {
        if(typeof node === "string"){
            thisNode = document.getElementById(node);
            thisNode.parentNode.removeChild(thisNode);
            this.node = null;
        }
        else if(typeof node === "object"){
            node.parentNode.removeChild(node);
            this.node = null;
        }
    }

    //Add a scoped stylesheet after begin
    appendStylesheet(styles="", node=this.node) {
        if(typeof styles === 'string') {
            var link = document.createElement('link');
            link.rel = "stylesheet";
            link.type = "text/css";
            link.href = styles;

            node.insertAdjacentElement('afterbegin',link);
        }
        else if (Array.isArray(styles)) {
            styles.forEach((style) => {
                var link = document.createElement('link');
                link.rel = "stylesheet";
                link.type = "text/css";
                link.href = style;

                node.insertAdjacentElement('afterbegin',link);
            });
        }
        else if (typeof styles === 'function') {
            let stylehtml = styles();
            node.insertAdjacentHTML('afterbegin',stylehtml);
        }
    }
}



//By Joshua Brewster (MIT)
//Simple state manager.
//Set key responses to have functions fire when keyed values change
//add variables to state with addToState(key, value, keyonchange (optional))
export class StateManager {
    constructor(init = {},interval="FRAMERATE") { //Default interval is at the browser framerate
        this.data = init;
        this.data["stateUpdateInterval"] = interval;
        this.pushToState={};
        this.prev = Object.assign({},this.data);;
                
        this.listener = new ObjectListener();

        /*
        const onStateChanged = () => {
            this.prev = Object.assign({},this.data);
            //this.prev=JSON.parse(JSON.stringifyFast(this.data));
        }

        //Causes app to be stuck on startup
        this.listener.addListener(
            "state",
            this.data,
            "__ANY__",
            onStateChanged,
            interval,
        );
        */
        
        const stateUpdateResponse = () => {
            this.listener.listeners.forEach((obj,i) => {
                obj.interval = this.data["stateUpdateInterval"];
            });
        }

        this.listener.addListener(
            "interval",
            this.data,
            "stateUpdateInterval",
            stateUpdateResponse,
            interval
        );

        const pushToStateResponse = () => {
            if(Object.keys(this.pushToState).length > 0) {
                Object.assign(this.prev,this.data);//Temp fix until the global state listener function works as expected
                Object.assign(this.data,this.pushToState);
                //console.log("new state: ", this.data); console.log("props set: ", this.pushToState);
                for (const prop of Object.getOwnPropertyNames(this.pushToState)) {
                    delete this.pushToState[prop];
                }
            }
        }

        this.listener.addListener(
            "push",
            this.pushToState,
            "__ANY__",
            pushToStateResponse,
            interval
        );

    }

    //Alternatively just add to the state by doing this.state[key] = value with the state manager instance
    addToState(key, value, onchange=null, debug=false) {
        this.data[key] = value;
        if(onchange !== null){
            return this.addSecondaryKeyResponse(key,onchange,debug);
        }
    }

    getState() { //Return a hard copy of the latest state with reduced values
        return JSON.parse(JSON.stringifyFast(this.data));
    }

    setState(updateObj={}){ //Pass object with keys in. Undefined keys in state will be added automatically. State only notifies of change based on update interval
        //console.log("setting state");
        Object.assign(this.pushToState,updateObj);
        return this.pushToState;
    }

    //Set main onchange response for the property-specific object listener. Don't touch the state
    setPrimaryKeyResponse(key=null, onchange=null, debug=false) {
        if(onchange !== null){
            if(this.listener.hasKey(key)){
                this.listener.onchange(key, onchange);
            }
            else if(key !== null){
                this.listener.addListener(key,this.data,key,onchange,this.data["stateUpdateInterval"],debug);
            }
        }
    }

    //Add extra onchange responses to the object listener for a set property. Use state key for state-wide change responses
    addSecondaryKeyResponse(key=null, onchange=null, debug=false) {
        if(onchange !== null){
            if(this.listener.hasKey(key)){
                return this.listener.addFunc(key, onchange);
            }
            else if(key !== null){
                this.listener.addListener(key,this.data,key,()=>{},this.data["stateUpdateInterval"],debug);
                return this.listener.addFunc(key, onchange);
            }
            else { return this.listener.addFunc("state", onchange);}
        }
    }

    //removes all secondary responses if idx left null. use "state" key for state-wide change responses
    removeSecondaryKeyResponse(key=null,responseIdx=null) {
        if(key !== null) {
            if(this.listener.hasKey(key)){
                this.listener.removeFuncs(key, responseIdx);
            }
        }
        else{console.error("provide key")}
    }

    //Remove any extra object listeners for a key. Entering "state" will break the state manager's primary response
    clearAllKeyResponses(key=null) {
        if(this.listener.hasKey(key))
            this.listener.remove(key);
    }

    //Save the return value to provide as the responseIdx in unsubscribe
    subscribe(key, onchange) {
        if(this.data[key] === undefined) {this.addToState(k,null,onchange);}
        else {return this.addSecondaryKeyResponse(key,onchange);}
    }

    //Unsubscribe from the given key using the index of the response saved from the subscribe() function
    unsubscribe(key, responseIdx=null) {
        if(responseIdx !== null) this.removeSecondaryKeyResponse(key, responseIdx);
        else console.error("Specify a subcription function index");
    }

    unsubscribeAll(key) { // Removes the listener for the key (including the animation loop)
        this.clearAllKeyResponses(key);
    }

}

