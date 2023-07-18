var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// rust-analyzer-wasm/ra-wasm/pkg/snippets/wasm-bindgen-rayon-7afa899f36665473/src/workerHelpers.js
function waitForMsgType(target, type) {
  return new Promise((resolve) => {
    target.addEventListener("message", function onMsg({ data }) {
      if (data == null || data.type !== type)
        return;
      target.removeEventListener("message", onMsg);
      resolve(data);
    });
  });
}
async function startWorkers(module, memory, builder) {
  const workerInit = {
    type: "wasm_bindgen_worker_init",
    module,
    memory,
    receiver: builder.receiver()
  };
  _workers = await Promise.all(
    Array.from({ length: builder.numThreads() }, async () => {
      const worker = new Worker(new URL("./workerHelpers.js", "https://rust-book.cs.brown.edu/quiz/"), {
        type: "module"
      });
      worker.postMessage(workerInit);
      await waitForMsgType(worker, "wasm_bindgen_worker_ready");
      return worker;
    })
  );
  builder.build();
}
var _workers;
var init_workerHelpers = __esm({
  "rust-analyzer-wasm/ra-wasm/pkg/snippets/wasm-bindgen-rayon-7afa899f36665473/src/workerHelpers.js"() {
    waitForMsgType(self, "wasm_bindgen_worker_init").then(async (data) => {
      const pkg = await Promise.resolve().then(() => (init_wasm_demo(), wasm_demo_exports));
      await pkg.default(data.module, data.memory);
      postMessage({ type: "wasm_bindgen_worker_ready" });
      pkg.wbg_rayon_start_worker(data.receiver);
    });
  }
});

// rust-analyzer-wasm/ra-wasm/pkg/wasm_demo.js
var wasm_demo_exports = {};
__export(wasm_demo_exports, {
  WorldState: () => WorldState,
  default: () => wasm_demo_default,
  initThreadPool: () => initThreadPool,
  start: () => start,
  wbg_rayon_PoolBuilder: () => wbg_rayon_PoolBuilder,
  wbg_rayon_start_worker: () => wbg_rayon_start_worker
});
function getObject(idx) {
  return heap[idx];
}
function dropObject(idx) {
  if (idx < 36)
    return;
  heap[idx] = heap_next;
  heap_next = idx;
}
function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}
function getUint8Memory0() {
  if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory0;
}
function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().slice(ptr, ptr + len));
}
function addHeapObject(obj) {
  if (heap_next === heap.length)
    heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];
  heap[idx] = obj;
  return idx;
}
function debugString(val) {
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    return toString.call(val);
  }
  if (className == "Object") {
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  if (val instanceof Error) {
    return `${val.name}: ${val.message}
${val.stack}`;
  }
  return className;
}
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length);
    getUint8Memory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len);
  const mem = getUint8Memory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127)
      break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3);
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);
    offset += ret.written;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
function getInt32Memory0() {
  if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
    cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachegetInt32Memory0;
}
function start() {
  wasm.start();
}
function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    wasm.__wbindgen_exn_store(addHeapObject(e));
  }
}
function initThreadPool(num_threads) {
  var ret = wasm.initThreadPool(num_threads);
  return takeObject(ret);
}
function wbg_rayon_start_worker(receiver) {
  wasm.wbg_rayon_start_worker(receiver);
}
async function load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}
async function init(input, maybe_memory) {
  if (typeof input === "undefined") {
    input = new URL("wasm_demo_bg.wasm", "https://rust-book.cs.brown.edu/quiz/");
  }
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
  };
  imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
    var ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
    var ret = getObject(arg0);
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_68adb0d58759a4ed = function() {
    var ret = new Object();
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_number_new = function(arg0) {
    var ret = arg0;
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_is_undefined = function(arg0) {
    var ret = getObject(arg0) === void 0;
    return ret;
  };
  imports.wbg.__wbg_set_2e79e744454afade = function(arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
  };
  imports.wbg.__wbg_new_693216e109162396 = function() {
    var ret = new Error();
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_stack_0ddaca5d1abfb52f = function(arg0, arg1) {
    var ret = getObject(arg1).stack;
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_error_09919627ac0992f5 = function(arg0, arg1) {
    try {
      console.error(getStringFromWasm0(arg0, arg1));
    } finally {
      wasm.__wbindgen_free(arg0, arg1);
    }
  };
  imports.wbg.__wbg_now_559193109055ebad = function(arg0) {
    var ret = getObject(arg0).now();
    return ret;
  };
  imports.wbg.__wbg_new_949bbc1147195c4e = function() {
    var ret = new Array();
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_newnoargs_be86524d73f67598 = function(arg0, arg1) {
    var ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_get_4d0f21c2f823742e = function() {
    return handleError(function(arg0, arg1) {
      var ret = Reflect.get(getObject(arg0), getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_call_888d259a5fefc347 = function() {
    return handleError(function(arg0, arg1) {
      var ret = getObject(arg0).call(getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_self_c6fbdfc2918d5e58 = function() {
    return handleError(function() {
      var ret = self.self;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_window_baec038b5ab35c54 = function() {
    return handleError(function() {
      var ret = window.window;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_globalThis_3f735a5746d41fbd = function() {
    return handleError(function() {
      var ret = globalThis.globalThis;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_global_1bc0b39582740e95 = function() {
    return handleError(function() {
      var ret = global.global;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_push_284486ca27c6aa8b = function(arg0, arg1) {
    var ret = getObject(arg0).push(getObject(arg1));
    return ret;
  };
  imports.wbg.__wbg_new_342a24ca698edd87 = function(arg0, arg1) {
    var ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
    var ret = debugString(getObject(arg1));
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbindgen_module = function() {
    var ret = init.__wbindgen_wasm_module;
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_memory = function() {
    var ret = wasm.memory;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_startWorkers_04f63eca19916b8f = function(arg0, arg1, arg2) {
    var ret = startWorkers(takeObject(arg0), takeObject(arg1), wbg_rayon_PoolBuilder.__wrap(arg2));
    return addHeapObject(ret);
  };
  if (typeof input === "string" || typeof Request === "function" && input instanceof Request || typeof URL === "function" && input instanceof URL) {
    input = fetch(input);
  }
  imports.wbg.memory = maybe_memory || new WebAssembly.Memory({ initial: 35, maximum: 16384, shared: true });
  const { instance, module } = await load(await input, imports);
  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;
  wasm.__wbindgen_start();
  return wasm;
}
var wasm, heap, heap_next, cachedTextDecoder, cachegetUint8Memory0, WASM_VECTOR_LEN, cachedTextEncoder, encodeString, cachegetInt32Memory0, WorldState, wbg_rayon_PoolBuilder, wasm_demo_default;
var init_wasm_demo = __esm({
  "rust-analyzer-wasm/ra-wasm/pkg/wasm_demo.js"() {
    init_workerHelpers();
    heap = new Array(32).fill(void 0);
    heap.push(void 0, null, true, false);
    heap_next = heap.length;
    cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    cachegetUint8Memory0 = null;
    WASM_VECTOR_LEN = 0;
    cachedTextEncoder = new TextEncoder("utf-8");
    encodeString = function(arg, view) {
      const buf = cachedTextEncoder.encode(arg);
      view.set(buf);
      return {
        read: arg.length,
        written: buf.length
      };
    };
    cachegetInt32Memory0 = null;
    WorldState = class {
      static __wrap(ptr) {
        const obj = Object.create(WorldState.prototype);
        obj.ptr = ptr;
        return obj;
      }
      __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;
        return ptr;
      }
      free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_worldstate_free(ptr);
      }
      /**
      */
      constructor() {
        var ret = wasm.worldstate_new();
        return WorldState.__wrap(ret);
      }
      /**
      * @param {string} code
      * @param {string} fake_std
      * @param {string} fake_core
      * @param {string} fake_alloc
      */
      init(code, fake_std, fake_core, fake_alloc) {
        var ptr0 = passStringToWasm0(code, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(fake_std, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = passStringToWasm0(fake_core, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        var ptr3 = passStringToWasm0(fake_alloc, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len3 = WASM_VECTOR_LEN;
        wasm.worldstate_init(this.ptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
      }
      /**
      * @param {string} code
      * @returns {any}
      */
      update(code) {
        var ptr0 = passStringToWasm0(code, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ret = wasm.worldstate_update(this.ptr, ptr0, len0);
        return takeObject(ret);
      }
      /**
      * @returns {any}
      */
      inlay_hints() {
        var ret = wasm.worldstate_inlay_hints(this.ptr);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @returns {any}
      */
      completions(line_number, column) {
        var ret = wasm.worldstate_completions(this.ptr, line_number, column);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @returns {any}
      */
      hover(line_number, column) {
        var ret = wasm.worldstate_hover(this.ptr, line_number, column);
        return takeObject(ret);
      }
      /**
      * @returns {any}
      */
      code_lenses() {
        var ret = wasm.worldstate_code_lenses(this.ptr);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @param {boolean} include_declaration
      * @returns {any}
      */
      references(line_number, column, include_declaration) {
        var ret = wasm.worldstate_references(this.ptr, line_number, column, include_declaration);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @returns {any}
      */
      prepare_rename(line_number, column) {
        var ret = wasm.worldstate_prepare_rename(this.ptr, line_number, column);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @param {string} new_name
      * @returns {any}
      */
      rename(line_number, column, new_name) {
        var ptr0 = passStringToWasm0(new_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ret = wasm.worldstate_rename(this.ptr, line_number, column, ptr0, len0);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @returns {any}
      */
      signature_help(line_number, column) {
        var ret = wasm.worldstate_signature_help(this.ptr, line_number, column);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @returns {any}
      */
      definition(line_number, column) {
        var ret = wasm.worldstate_definition(this.ptr, line_number, column);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @returns {any}
      */
      type_definition(line_number, column) {
        var ret = wasm.worldstate_type_definition(this.ptr, line_number, column);
        return takeObject(ret);
      }
      /**
      * @returns {any}
      */
      document_symbols() {
        var ret = wasm.worldstate_document_symbols(this.ptr);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @param {string} ch
      * @returns {any}
      */
      type_formatting(line_number, column, ch) {
        var ret = wasm.worldstate_type_formatting(this.ptr, line_number, column, ch.codePointAt(0));
        return takeObject(ret);
      }
      /**
      * @returns {any}
      */
      folding_ranges() {
        var ret = wasm.worldstate_folding_ranges(this.ptr);
        return takeObject(ret);
      }
      /**
      * @param {number} line_number
      * @param {number} column
      * @returns {any}
      */
      goto_implementation(line_number, column) {
        var ret = wasm.worldstate_goto_implementation(this.ptr, line_number, column);
        return takeObject(ret);
      }
    };
    wbg_rayon_PoolBuilder = class {
      static __wrap(ptr) {
        const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
        obj.ptr = ptr;
        return obj;
      }
      __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;
        return ptr;
      }
      free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wbg_rayon_poolbuilder_free(ptr);
      }
      /**
      * @returns {number}
      */
      numThreads() {
        var ret = wasm.wbg_rayon_poolbuilder_numThreads(this.ptr);
        return ret >>> 0;
      }
      /**
      * @returns {number}
      */
      receiver() {
        var ret = wasm.wbg_rayon_poolbuilder_receiver(this.ptr);
        return ret;
      }
      /**
      */
      build() {
        wasm.wbg_rayon_poolbuilder_build(this.ptr);
      }
    };
    wasm_demo_default = init;
  }
});

// src/ra-worker.js
init_wasm_demo();
var start2 = async () => {
  await wasm_demo_default();
  const state = new WorldState();
  onmessage = (e) => {
    const { which, args, id } = e.data;
    const result = state[which](...args);
    postMessage({
      id,
      result
    });
  };
};
start2().then(() => {
  postMessage({
    id: "ra-worker-ready"
  });
});
