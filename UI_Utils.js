
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

//By Joshua Brewster (MIT License)

//Create instance and then call instance.addListener(listenerName,objectToListenTo,propToListenTo,onchange,interval).
//name, propToListenTo, onchange, and interval are optional (leave or set as undefined). Onchange is a custom callback just like for other event listeners. Set a name to make it easier to start and stop or edit each listener.
export class ObjectListener {
    constructor(debug=false, synchronous=false) {
        this.debug = debug;
        this.listeners = [];
        this.synchronous = synchronous;//check all listeners simulatenously instead of on individual loops. use startSync() to trigger
        this.syncInterval = 'FRAMERATE'; //interval
        this.syncAnim = undefined;
        if(synchronous === true) this.startSync();
    }

    //add a new object listener with specified props (or none to watch the whole object), and onchange functions, with optional interval
    addListener(listenerKey=null,objectToListenTo,propToListenTo=undefined,onchange=undefined,interval=undefined,debug=this.debug,startRunning=true) {
        if(objectToListenTo === undefined) {
            console.error("You must assign an object");
            return;
        }

        var key = listenerKey;
        if(key == null) {
            key = Math.floor(Math.random()*100000);
        }
        if(this.synchronous === true) startRunning = false; //negate this in case of synchronous runtime
        var listener = {key:key, listener: new ObjectListenerInstance(objectToListenTo,propToListenTo,onchange,interval,debug,startRunning)};
        this.listeners.push(listener);
    }

    getListener(key) {
        let found = this.listeners.find((item,i) =>{
            if(item.key === key) return true;
        });
        return found;
    }

    hasKey(key) {
        var found = false;
        this.listeners.forEach((item,i) =>{
            if(item.key === key) {found = true; return true;}
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
        if(key == null) {
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
    addFunc = (key=null,newCallback=null, start=true) => {
        var callbackIdx = null;
        if(newCallback !== null){
            if(key == null) {
                this.listeners.forEach((obj,i) => {
                    callbackIdx = obj.listener.addFunc(newCallback);
                    if(obj.listener.running == false && start == true)
                        obj.listener.start();
                });
            }
            else {
                var found = this.listeners.find((obj,i) => {
                    if(obj.key === key) {
                        callbackIdx = obj.listener.addFunc(newCallback);
                        if(obj.listener.running == false && start == true)
                            obj.listener.start();
                    }
                });
            }
        }
        return callbackIdx;
    }

    //get the array of secondary onchange functions
    getFuncs = (key=undefined) => {
        if(key) {
            var found = this.listeners.find((o,i) => {
                if(o.key === key) {
                    return true;
                }
            });
            return found.onchangeFuncs;
        } else return undefined;
    }

    //Remove extra onchange functions
    removeFuncs = (key = null, idx = null, stop=false) => {
        if(key == null) {
            this.listeners.forEach((obj,i) => {
                obj.listener.removeFuncs(idx);
            });
        }
        else {
            var found = this.listeners.find((o,i) => {
                if(o.key === key) {
                    o.listener.removeFuncs(idx);
                    if(o.listener.onchangeFuncs.length === 0 || stop === true) {
                        o.listener.stop()
                    }
                }
            });
        }
    }

    //Stop all or named listeners
    stop(key=null) {
        if(this.synchronous) this.stopSync();
        if(key == null) {
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
        if(this.synchronous) this.stopSync();
        if(key == null) {
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

    //run listeners synchronously instead of on their own individual loops
    startSync() {
        if(this.synchronous === false) {
            this.synchronous = true;
            this.stop(); //stop the async calls
            let runChecks = () => {
                if(this.synchronous === true) {
                    this.listeners.forEach((l)=>{
                        l.listener.check();
                    });
                    if(this.syncInterval === 'FRAMERATE') {
                        this.syncAnim = requestAnimationFrame(runChecks);
                    } else if (typeof this.syncInterval === 'number') {
                        setTimeout(runChecks, this.syncInterval);
                    }
                }
            }
            runChecks();
        }
    }

    //stop the synchronous checking
    stopSync() {
        this.synchronous = false;
        if(this.syncAnim) cancelAnimationFrame(this.syncAnim);
    }   

    remove(key=null){
        if(key == null) {
            this.listeners.forEach((listener) => {
                listener.stop();
            });
            this.listeners.splice(0,this.listeners.length);
        }
        else {
            var indices = [];
            var found = this.listeners.forEach((o,i) => {
                if(o.key === key) {
                    indices.push(i);
                }
            });
            indices.reverse().forEach((idx) => {
                this.listeners[idx].listener.stop();
                this.listeners.splice(idx,1);
            });
        }
    }
}

//Instance of an object listener. This will subscribe to object properties (or whole objects) and run attached functions when a change is detected.
export class ObjectListenerInstance {
    constructor(object,propName="__ANY__",onchange=this.onchange,interval="FRAMERATE",debug=false,startRunning=true) {
        this.debug=debug;

        this.onchange = onchange; //Main onchange function
        this.onchangeFuncs = []; //Execute extra functions pushed to this array

        this.object = object; //Objects are always passed by reference
        this.propName = propName;
        this.propOld = undefined;
        this.setListenerRef(propName);

        this.running = startRunning;
        this.funcs = 0;

        this.interval;
        if(interval < 10) {
            this.interval = 10; console.log("Min recommended interval set: 10ms");}
        else {
            this.interval = interval;
        }

        if(startRunning === true) {
            if (typeof window === 'undefined') {
                setTimeout(()=>{this.check();}, 60)
            } else {
                this.checker = requestAnimationFrame(this.check);
            }
        }
    }

    //Main onchange execution
    onchange = (newData) => {
        console.log(this.propName," changed from: ", this.propOld," to: ", this.object[this.propName]);
    }

    //Add extra onchange functions for execution
    addFunc = (onchange=null) => {
        let sub = 0;
        if(onchange !== null){
            this.onchangeFuncs.push({idx:this.funcs, onchange:onchange});
            sub=this.funcs;
            this.funcs++;
        }
        return sub;
    }

    //Remove extra onchange functions
    removeFuncs(idx = null) {
        let i = 0;
        if(idx === null) {
            this.onchangeFuncs = [];
        }
        else if(this.onchangeFuncs.find((o,j)=>{if(o.idx===idx){ i=j; return true;}}) !== undefined) {
            this.onchangeFuncs.splice(i,1);
        }
    }

    //Execute extra onchange functions
    onchangeMulti = (newData) => {
        let onChangeCache = [...this.onchangeFuncs]
        onChangeCache.forEach((func,i) => {
            if(this.debug === true) { console.log(func.onchange); }
            func.onchange(newData);
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
        let changed = false;
        if(this.propName === "__ANY__" || this.propName === null || this.propName === undefined){
            if(this.propOld !== JSON.stringifyFast(this.object)){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object);
                if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object); }
                this.setListenerRef(this.propName);
                changed = true;
            }
        }
        else if(Array.isArray(this.object[this.propName])) { //cut arrays down for speed
            if(this.propOld !== JSON.stringifyFast(this.object[this.propName].slice(this.object[this.propName].length-20))){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object[this.propName]);
                if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object[this.propName]); }
                this.setListenerRef(this.propName);
                changed = true;
            }
        }
        else if(typeof this.object[this.propName] === "object") {
            let string = JSON.stringifyFast(this.object[this.propName]);
            if(this.propOld !== string){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object[this.propName]);
                if(this.onchangeFuncs.length > 0) { 
                    this.onchangeMulti(this.object[this.propName]); 
                }
                this.setListenerRef(this.propName);
                changed = true;
            }
        }
        else if(typeof this.object[this.propName] === "function") {
            if(this.propOld !== this.object[this.propName].toString()){
                if(this.debug === true) { console.log("onchange: ", this.onchange); }
                this.onchange(this.object[this.propName].toString());
                if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object[this.propName].toString()); }
                this.setListenerRef(this.propName);
                changed = true;
            }
        }
        else if(this.object[this.propName] !== this.propOld) {
            if(this.debug === true) { console.log("onchange: ", this.onchange); }
            this.onchange(this.object[this.propName]);
            if(this.onchangeFuncs.length > 0) { this.onchangeMulti(this.object[this.propName]); }
            this.setListenerRef(this.propName);
            changed = true;
        }
        
        if(this.running === true) {
            if(this.debug === true) {console.log("checking", this.object, this.propName);}
            if(this.interval === "FRAMERATE"){
                if (typeof window === 'undefined') {
                    setTimeout(()=>{this.check();}, 16)
                } else {
                    this.checker = requestAnimationFrame(this.check);
                }
            }
            else {
                setTimeout(()=>{this.check();},this.interval);
            }
        };

        return changed;
    }

    start() {
        this.running = true;
        if (typeof window === 'undefined') {
            setTimeout(()=>{this.check();}, 16);
        } else {
            this.checker = requestAnimationFrame(this.check);
        }
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

        function updateParents(key, value) {
            var idx = parents.length - 1;
            //console.log(idx, parents[idx])
            if(parents[idx]){
                var prev = parents[idx];
                //console.log(value); 
                if (prev[key] === value || idx === 0) {
                    path.push(key);
                    parents.push(value.pushed);
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
        }

        function checkValues(key, value) {
            let val;
            if (value != null) {
                if (typeof value === "object") {
                    //if (key) { updateParents(key, value); }
                    let c = value.constructor.name;
                    if (key && c === 'Object') {updateParents(key, value); }

                    let other = refs.get(value);
                    if (other) {
                        return '[Circular Reference]' + other;
                    } else {
                        refs.set(value, path.join('.'));
                    }
                    if(c === "Array") { //Cut arrays down to 100 samples for referencing
                        if(value.length > 20) {
                            val = value.slice(value.length-20);
                        } else val = value;
                       // refs.set(val, path.join('.'));
                    }  
                    else if (c.includes("Set")) {
                        val = Array.from(value)
                    }  
                    else if (c !== "Object" && c !== "Number" && c !== "String" && c !== "Boolean") { //simplify classes, objects, and functions, point to nested objects for the state manager to monitor those properly
                        val = "instanceof_"+c;
                    }
                    else if (c === 'Object') {
                        let obj = {};
                        for(const prop in value) {
                            if (value[prop] == null){
                                obj[prop] = value[prop]; 
                            }
                            else if(Array.isArray(value[prop])) { 
                                if(value[prop].length>20)
                                    obj[prop] = value[prop].slice(value[prop].length-20); 
                                else obj[prop] = value[prop];
                            } //deal with arrays in nested objects (e.g. means, slices)
                            else if (value[prop].constructor.name === 'Object') { //additional layer of recursion for 3 object-deep array checks
                                obj[prop] = {};
                                for(const p in value[prop]) {
                                    if(Array.isArray(value[prop][p])) {
                                        if(value[prop][p].length>20)
                                            obj[prop][p] = value[prop][p].slice(value[prop][p].length-20); 
                                        else obj[prop][p] = value[prop][p];
                                    }
                                    else { 
                                        if (value[prop][p] != null){
                                            let con = value[prop][p].constructor.name;
                                            if (con.includes("Set")) {
                                                obj[prop][p] = Array.from(value[prop][p])
                                            } else if(con !== "Number" && con !== "String" && con !== "Boolean") {
                                                obj[prop][p] = "instanceof_"+con; //3-deep nested objects are cut off
                                            }  else {
                                                obj[prop][p] = value[prop][p]; 
                                            }
                                        } else {
                                            obj[prop][p] = value[prop][p]; 
                                        }
                                    }
                                }
                            }
                            else { 
                                let con = value[prop].constructor.name;
                                if (con.includes("Set")) {
                                    obj[prop] = Array.from(value[prop])
                                } else if(con !== "Number" && con !== "String" && con !== "Boolean") {
                                    obj[prop] = "instanceof_"+con;
                                } else {
                                    obj[prop] = value[prop]; 
                                }
                            }
                        }
                        //console.log(obj, value)
                        val = obj;
                        //refs.set(val, path.join('.'));
                    }
                    else {
                        val = value;
                    }
                } else {
                    val = value;
                }
            }
            //console.log(value, val)
            return val;
        }

        return function stringifyFast(obj, space) {
            try {
                parents.push(obj);
                return JSON.stringify(obj, checkValues, space);
            } catch(er) {
                console.error(obj, er);
            } finally {
                clear();
            } 
        }
    })();
}



if(JSON.stringifyWithCircularRefs === undefined) {
    //Workaround for objects containing DOM nodes, which can't be stringified with JSON. From: https://stackoverflow.com/questions/4816099/chrome-sendrequest-error-typeerror-converting-circular-structure-to-json
    JSON.stringifyWithCircularRefs = (function() {
        const refs = new Map();
        const parents = [];
        const path = ["this"];

        function clear() {
        refs.clear();
        parents.length = 0;
        path.length = 1;
        }

        function updateParents(key, value) {
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

        function checkCircular(key, value) {
        if (value != null) {
            if (typeof value === "object") {
            if (key) { updateParents(key, value); }

            let other = refs.get(value);
            if (other) {
                return '[Circular Reference]' + other;
            } else {
                refs.set(value, path.join('.'));
            }
            }
        }
        return value;
        }

        return function stringifyWithCircularRefs(obj, space) {
        try {
            parents.push(obj);
            return JSON.stringify(obj, checkCircular, space);
        } finally {
            clear();
        }
        }
    })();
}




//By Joshua Brewster (MIT)

/* 
const htmlprops = {
  id:'template1'
};

function templateStringGen(props) { //write your html in a template string
    return `
    <div id=${props.id}>Clickme</div>
    `;
}

function onRender(props) { //setup html
    document.getElementById(props.id).onclick = () => { 
      document.getElementById(props.id).innerHTML = "Clicked!"; 
    }
}

function onchange(props) { //optional if you want to be able to auto-update the html with changes to the properties, not recommended if you only want to update single divs
  console.log('props changed!', props);
}

function ondelete(props) { //called before the node is deleted, use to clean up animation loops and event listeners
}

function onresize() { //adds a resize listener to the window, this is automatically cleaned up when you delete the node.
}

const fragment = new DOMFragment(
                        templateStringGen,
                        document.body,
                        htmlprops,
                        onRender,
                        undefined, //onchange
                        "NEVER", //"FRAMERATE" //1000
                        ondelete,
                        onresize
                      ); 
                      
//... later ...
fragment.deleteNode(); //deletes the rendered fragment if you are done with it.

*/

export class DOMFragment {
    /**
     * @ignore
     * @constructor
     * @alias DOMFragment
     * @description Create a DOM fragment.
     * @param {function} templateStringGen - Function to generate template string (or template string itself, or Element)
     * @param {HTMLElement} parentNode HTML DOM node to append fragment into.
     * @param {callback} onRender Callback when element is rendered. Use to setup html logic via js
     * @param {callback} onchange Callback when element is changed.
     * @param {int} propUpdateInterval How often to update properties.
     * @param {callback} ondelete Called just before the node is deleted (e.g. to clean up animations)
     * @param {callback} onresize Called on window resize, leave undefined to not create resize events
     */
    constructor(templateStringGen=this.templateStringGen, parentNode=document.body, props={}, onRender=(props)=>{}, onchange=(props)=>{}, propUpdateInterval="NEVER", ondelete=(props)=>{}, onresize=undefined) {
        this.onRender = onRender;
        this.onchange = onchange;
        this.ondelete = ondelete;
        this.onresize = onresize;

        this.parentNode = parentNode;
        if(typeof parentNode === "string") {
            this.parentNode = document.getElementById(parentNode);
        }
        this.renderSettings = {
            templateStringGen: templateStringGen,
            props: props
        }
        this.props = this.renderSettings.props;
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

        this.listener = undefined;
    
        if((Object.keys(this.renderSettings.props).length > 0) && !(interval === null || interval === undefined || interval === "NEVER")) {
            console.log("making listeners for ", templateStringGen);
            this.listener = new ObjectListener();

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
                this.onchange();
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

    //called after a change in props are detected if interval is not set to "NEVER"
    onchange = (props=this.renderSettings.props) => {}

    //called after the html is rendered
    onRender = (props=this.renderSettings.props) => {}

    //called BEFORE the node is removed
    ondelete = (props=this.renderSettings.props) => {}

    onresize = undefined  //define resizing function

    //appendId is the element Id you want to append this fragment to
    appendFragment(toAppend, parentNode) {
        if (this.isElement(toAppend)) parentNode.appendChild(toAppend);
        else {
            var template = document.createElement('template');
            template.innerHTML = toAppend;
            var fragment = template.content;
            parentNode.appendChild(fragment);
        }
        return parentNode.children[parentNode.children.length-1];
    }

    isElement = (element) => {
        return element instanceof Element || element instanceof HTMLDocument;  
    }
  
    //delete selected fragment. Will delete the most recent fragment if Ids are shared.
    deleteFragment(parentNode,nodeId) {
        this.ondelete(this.renderSettings.props); //called BEFORE the node is removed
        var node = document.getElementById(nodeId);
        parentNode.removeChild(node);
    }
  
    //Remove Element Parent By Element Id (for those pesky anonymous child fragment containers)
    removeParent(elementId) {
        // Removes an element from the document
        if(typeof this.onresize === 'function') {
            this.removeNodeResizing();
        }
        this.ondelete(this.renderSettings.props);
        var element = document.getElementById(elementId);
        element.parentNode.parentNode.removeChild(element.parentNode);
    }

    renderNode(parentNode=this.parentNode){
        this.node = this.appendFragment(this.templateString,parentNode);
        this.onRender(this.renderSettings.props);
        if(typeof this.onresize === 'function') {
            this.setNodeResizing();
        }
    }

    setNodeResizing() {
        if(typeof this.onresize === 'function') {
            if(window.attachEvent) {
                window.attachEvent('onresize', this.onresize);
            }
            else if(window.addEventListener) {
                window.addEventListener('resize', this.onresize, true);
            }
        }
    }

    removeNodeResizing() {
        if(typeof this.onresize === 'function') {
            if(window.detachEvent) {
                window.detachEvent('onresize', this.onresize);
            }
            else if(window.removeEventListener) {
                window.removeEventListener('resize', this.onresize, true);
            }
        }
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
        if(typeof this.onresize === 'function') {
            this.removeNodeResizing();
        }
        if(typeof node === "string"){
            this.ondelete(this.renderSettings.props);
            thisNode = document.getElementById(node);
            thisNode.parentNode.removeChild(thisNode);
            this.node = null;
        }
        else if(typeof node === "object"){
            this.ondelete(this.renderSettings.props);
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
            let styleResult = styles();
            if (typeof styleResult === 'string') node.insertAdjacentHTML('afterbegin',styleResult);
            else node.insertAdjacentElement('afterbegin',styleResult);
        }
    }
}




//By Joshua Brewster (MIT License)
//Simple state manager.
//Set key responses to have functions fire when keyed values change
//add variables to state with addToState(key, value, keyonchange (optional))
export class StateManager {
    constructor(init = {}, interval="FRAMERATE", defaultKeyEventLoop=true) { //Default interval is at the browser framerate
        this.data = init;
        this.interval = interval;
        this.pushToState={};
        this.pushRecord={pushed:[]}; //all setStates between frames
        this.pushCallbacks = {};
        this.triggers = {};

        this.listener = new ObjectListener();
        this.defaultStartListenerEventLoop = defaultKeyEventLoop;

        /*
        this.prev = Object.assign({},this.data);
         
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
    }

    setInterval(interval="FRAMERATE") {
        this.interval = interval;
        this.listener.listeners.forEach((obj,i) => {
            obj.interval = this.interval;
        });
    }


    // Managed State Updates. Must Still Clean Event Listeners
    updateState(key, value){
        if (this.data[key] == null){
            this.addToState(key,value)
        } else {
            this.data[key] = value
        }    
    }

    removeState(key, sequential=false){
            if (sequential) this.unsubscribeAllSequential(key);
            else this.unsubscribeAll(key);
            delete this.data[key]

            // Log Update
            this.setSequentialState({stateRemoved: key})
    }

    setupSynchronousUpdates = () => {
        if(!this.listener.hasKey('pushToState')) {
            //we won't add this listener unless we use this function
            const pushToStateResponse = () => {
                if(Object.keys(this.pushToState).length > 0) {
                    //Object.assign(this.prev,this.data);//Temp fix until the global state listener function works as expected
                    Object.assign(this.data,this.pushToState);

                    //console.log("new state: ", this.data); console.log("props set: ", this.pushToState);
                    for (const prop of Object.getOwnPropertyNames(this.pushToState)) {
                        delete this.pushToState[prop];
                    }
                }
            }
    
            this.listener.addListener(
                "pushToState",
                this.pushToState,
                "__ANY__",
                pushToStateResponse,
                this.interval
            );

            this.addToState('pushRecord',this.pushRecord,(record)=>{

                let l = record.pushed.length;
                for (let i = 0; i < l; i++){
                    let updateObj = record.pushed[i];
                    for(const prop in updateObj) {
                        if(this.pushCallbacks[prop]) {
                            this.pushCallbacks[prop].forEach((o) =>{
                                o.onchange(updateObj[prop]);
                            });
                        }
                    }
                }
                this.pushRecord.pushed.splice(0,l);
            });

            this.data.pushCallbacks = this.pushCallbacks;

        }
    }

    //Alternatively just add to the state by doing this.state[key] = value with the state manager instance
    addToState(key, value, onchange=null, startRunning=this.defaultStartListenerEventLoop, debug=false) {
        if(!this.listener.hasKey('pushToState') && this.defaultStartListenerEventLoop) {
            this.setupSynchronousUpdates();
        }

        this.data[key] = value;

        // Log Update
        this.setSequentialState({stateAdded: key})

        if(onchange !== null){
            return this.addSecondaryKeyResponse(key,onchange,debug,startRunning);
        }
    }

    getState() { //Return a hard copy of the latest state with reduced values. Otherwise just use this.state.data
        return JSON.parse(JSON.stringifyFast(this.data));
    }

    //Synchronous set-state, only updates main state on interval. Can set to trigger now instead of waiting on interval. Also can append arrays in state instead of replacing them
    setState(updateObj={}, appendArrs=false){ //Pass object with keys in. Undefined keys in state will be added automatically. State only notifies of change based on update interval
        //console.log("setting state");
        if(!this.listener.hasKey('pushToState') && this.defaultStartListenerEventLoop) {
            this.setupSynchronousUpdates();
        }

        updateObj.stateUpdateTimeStamp = Date.now();
        this.pushRecord.pushed.push(JSON.parse(JSON.stringifyWithCircularRefs(updateObj)));
        
        if(appendArrs) {
            for(const prop in updateObj) { //3 object-deep array checks to buffer values instead of overwriting
                if(this.pushToState[prop]) {
                    if(Array.isArray(this.pushToState[prop]) && Array.isArray(updateObj[prop])) {
                        updateObj[prop] = this.pushToState[prop].push(...updateObj[prop]);
                    } else if (typeof this.pushToState[prop] === 'object' && typeof updateObj[prop] === 'object') {
                        for(const p in updateObj[prop]) {
                            if(this.pushToState[prop][p]) {
                                if(Array.isArray(this.pushToState[prop][p]) && Array.isArray(updateObj[prop][p])) {
                                    updateObj[prop][p] = this.pushToState[prop][p].push(...updateObj[prop][p]);
                                }
                                else if (typeof this.pushToState[prop][p] === 'object' && typeof updateObj[prop][p] === 'object') {
                                    for(const p2 in updateObj[prop][p]) {
                                        if(this.pushToState[prop][p][p2]) {
                                            if(Array.isArray(this.pushToState[prop][p][p2]) && Array.isArray(updateObj[prop][p][p2])) {
                                                updateObj[prop][p][p2] = this.pushToState[prop][p][p2].push(...updateObj[prop][p][p2]);
                                            }
                                        }
                                        else if (typeof this.pushToState[prop][p][p2] === 'object' && typeof updateObj[prop][p][p2] === 'object') {
                                            for(const p3 in updateObj[prop][p][p2]) {
                                                if(this.pushToState[prop][p][p2][p3]) {
                                                    if(Array.isArray(this.pushToState[prop][p][p2][p3]) && Array.isArray(updateObj[prop][p][p2][p3])) {
                                                        updateObj[prop][p][p2][p3] = this.pushToState[prop][p][p2][p3].push(...updateObj[prop][p][p2][p3]);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Object.assign(this.pushToState,updateObj);
        
        if(Object.keys(this.triggers).length > 0) {
            // Object.assign(this.data,this.pushToState);
            for (const prop of Object.getOwnPropertyNames(this.triggers)) {
                if(this.pushToState[prop]) {
                    this.data[prop] = this.pushToState[prop]
                    delete this.pushToState[prop];
                    this.triggers[prop].forEach((obj)=>{
                        obj.onchange(this.data[prop]);
                    });
                }
            }
        }

        return this.pushToState;
    }

    //Trigger-only functions on otherwise looping listeners
    subscribeTrigger(key=undefined,onchange=(key)=>{}) {

        // console.error('SUBSCRIBING')
        if(key) {
            if(!this.triggers[key]) {
                this.triggers[key] = [];
            }
            let l = this.triggers[key].length;
            this.triggers[key].push({idx:l, onchange:onchange});
            return this.triggers[key].length-1;
        } else return undefined;
    }

    //Delete specific trigger functions for a key
    unsubscribeTrigger(key=undefined,sub=0) {
        let idx = undefined;
        let obj = this.triggers[key].find((o)=>{
            if(o.idx===sub) {return true;}
        });
        if(obj) this.triggers[key].splice(idx,1);
    }

    //Remove all triggers for a key
    unsubscribeAllTriggers(key) {
        if(key && this.triggers[key]) {
            delete this.triggers[key];
        }
    }

    //only push to an object that keeps the sequences of updates instead of synchronously updating the whole state.
    setSequentialState(updateObj={}) {
        //console.log("setting state");
        if(!this.listener.hasKey('pushToState')) {
            this.setupSynchronousUpdates();
        }
        updateObj.stateUpdateTimeStamp = Date.now();
        this.pushRecord.pushed.push(JSON.parse(JSON.stringify(updateObj)));
    }

    subscribeSequential(key=undefined,onchange=undefined) {
        // console.error('SUBSCRIBING')

        if(key) {
            
            if(this.data[key] === undefined) {this.addToState(key,null,undefined);}

            if(!this.pushCallbacks[key])
                this.pushCallbacks[key] = [];

            if(onchange) {
                let idx = this.pushCallbacks[key].length;
                this.pushCallbacks[key].push({idx:idx, onchange:onchange});
                return this.pushCallbacks[key].length-1; //get key sub index for unsubscribing
            } 
            else return undefined;
        } else return undefined;
    }

    unsubscribeSequential(key=undefined,sub=0) {
        if(key){
            if(this.pushCallbacks[key]) {
                if(this.pushCallbacks[key].find((o,j)=>{
                    if(o.idx === sub) {
                        this.pushCallbacks[key].splice(j,1);
                        return true;
                    }
                })) {
                }
            }
        }
    }

    unsubscribeAllSequential(key) {
        if(key) {
            if(this.pushCallbacks[key]) {
                if(this.pushCallbacks[key]) {
                    delete this.pushCallbacks[key];
                }
            }
        }
    }

    //Set main onchange response for the property-specific object listener. Don't touch the state
    setPrimaryKeyResponse(key=null, onchange=null, debug=false, startRunning=this.defaultStartListenerEventLoop) {
        if(onchange !== null){
            if(this.listener.hasKey(key)){
                this.listener.onchange(key, onchange);
            }
            else if(key !== null){
                this.listener.addListener(key, this.data, key, onchange, this.data["stateUpdateInterval"], debug, startRunning);
            }
        }
    }

    //Add extra onchange responses to the object listener for a set property. Use state key for state-wide change responses
    addSecondaryKeyResponse(key=null, onchange=null, debug=false, startRunning=this.defaultStartListenerEventLoop) {
        if(onchange !== null){
            if(this.listener.hasKey(key)){
                return this.listener.addFunc(key, onchange);
            }
            else if(key !== null){
                this.listener.addListener(key, this.data,key,()=>{},this.data["stateUpdateInterval"], debug, startRunning);
                return this.listener.addFunc(key, onchange);
            }
            else { return this.listener.addFunc("state", onchange);}
        }
    }

    //removes all secondary responses if idx left null. use "state" key for state-wide change responses
    removeSecondaryKeyResponse(key=null,responseIdx=null, stopIfEmpty=true) {
        if(key !== null) {
            if(this.listener.hasKey(key)){
                this.listener.removeFuncs(key, responseIdx, stopIfEmpty);
            } else {
                console.error("key does not exist")
            }
        }
        else{console.error("provide key")}
    }

    //Remove any extra object listeners for a key. Entering "state" will break the state manager's primary response
    clearAllKeyResponses(key=null) {
        if(key === null) this.listener.remove(null);
        else if(this.listener.hasKey(key)) this.listener.remove(key);
    }

    //Get all of the onchange functions added via subscribe/addSecondaryKeyResponse
    getKeySubCallbacks(key) {
        let callbacks = this.listener.getFuncs(key);
        return callbacks;
    }

    //Save the return value to provide as the responseIdx in unsubscribe
    subscribe(key, onchange, startRunning=true) {
        // console.error('SUBSCRIBING')

        if(this.data[key] === undefined) {this.addToState(key,null,onchange,startRunning);}
        else {return this.addSecondaryKeyResponse(key,onchange);}
    }
    
    //Unsubscribe from the given key using the index of the response saved from the subscribe() function
    unsubscribe(key, responseIdx=null) {
        if(responseIdx !== null) this.removeSecondaryKeyResponse(key, responseIdx, true);
        else console.error("Specify a subcription function index");
    }

    unsubscribeAll(key) { // Removes the listener for the key (including the animation loop)
        this.clearAllKeyResponses(key);
        if(this.data[key]) delete this.data[key];
    }

    //runs only one animation frame to check all state keys
    runSynchronousListeners() {
        this.defaultStartListenerEventLoop = false;
        this.listener.startSync();
    }

    //stops the listener event loops without clearing the keys.
    stop(key=null) {
        this.listener.stop(key);
    }

}
