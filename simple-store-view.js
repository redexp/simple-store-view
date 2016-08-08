(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.SimpleStoreView = factory();
    }
}(this, function () {

    var _DEV_ = true;

    function SimpleStoreView(options) {
        this.options = options;
        this.store = options.store;
        this.statePath = typeof options.statePath === 'string' ? stringToPath(options.statePath) : options.statePath;

        this.ui = mergeExtendedField(this, 'ui', false);
        this.template = mergeExtendedField(this, 'template', true);

        // SimpleStoreView.helpers.template.call(this, 'root', this.template);

        this.trigger(SimpleStoreView.templateReadyEvent);
    }

    SimpleStoreView.extend = function(protoProps, staticProps) {
        protoProps = protoProps || {};

        var parent = this;
        var child;

        if (has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        }
        else {
            child = function () {
                return parent.apply(this, arguments);
            };
        }

        extend(child, parent, staticProps || {}, {__super__: parent.prototype});

        child.prototype = objectCreate(parent.prototype);
        extend(child.prototype, protoProps, {constructor: child});

        return child;
    };

    SimpleStoreView.helpers = {
        template: templateHelper,
        "class": classHelper
    };

    SimpleStoreView.templateReadyEvent = 'template-ready';

    SimpleStoreView.prototype.on = function (events, callback) {
        this.store.on(events, this.statePath, callback);

        return this;
    };

    SimpleStoreView.prototype.off = function (event, callback) {
        switch (arguments.length) {
        case 0:
            this.store.off(this.statePath);
            break;
        case 1:
            this.store.off(event, this.statePath);
            break;
        case 2:
            this.store.off(event, this.statePath, callback);
            break;
        }

        return this;
    };

    SimpleStoreView.prototype.trigger = function (events) {
        var args = [events, this.statePath].concat(Array.prototype.slice.call(arguments, 1));

        this.store.trigger.apply(this.store, args);

        return this;
    };

    function templateHelper(rootSelector, template) {
        if (rootSelector && has(this.ui, rootSelector)) {
            rootSelector = '{' + rootSelector + '}';
        }

        if (rootSelector) {
            rootSelector += ' ';
        }

        for (var selector in template) {
            if (!has(template, selector)) continue;

            var helpers = template[selector];

            for (var helper in helpers) {
                if (!has(helpers, helper)) continue;

                if (_DEV_) {
                    if (!has(helpers, helper)) {
                        throw new Error('Unknown helper "' + helper + '" in template of ' + this.constructor.name);
                    }
                }

                SimpleStoreView.helpers[helper].call(this, rootSelector + selector, helpers[helper]);
            }
        }
    }

    function classHelper (selector, options) {
        callJquerySetterMethod({
            view: this,
            node: this.find(selector),
            method: 'toggleClass',
            options: options,
            iteratorCallback: true,
            wrapper: function (v) {
                if (typeof v === 'function') {
                    return function () {
                        return !!v.apply(this, arguments);
                    };
                }

                return !!v;
            }
        });
    }

    function attrHelper (selector, options) {
        callJquerySetterMethod({
            view: this,
            node: this.find(selector),
            method: 'attr',
            options: options
        });
    }

    function propHelper (selector, options) {
        callJquerySetterMethod({
            view: this,
            node: this.find(selector),
            method: 'prop',
            options: options
        });
    }

    function styleHelper (selector, options) {
        callJquerySetterMethod({
            view: this,
            node: this.find(selector),
            method: 'css',
            options: options
        });
    }

    function htmlHelper (selector, options) {
        callJqueryMethod({
            view: this,
            node: this.find(selector),
            method: 'html',
            options: options,
            iteratorCallback: true
        });
    }

    function textHelper (selector, options) {
        callJqueryMethod({
            view: this,
            node: this.find(selector),
            method: 'text',
            options: options,
            iteratorCallback: true
        });
    }

    function onHelper (selector, options) {
        var view = this,
            node = this.find(selector),
            ops;

        for (var event in options) {
            if (!has(options, event)) continue;

            ops = options[event];

            switch (typeof ops) {
            case 'function':
                this.listenElement(node, event, ops);
                break;

            case 'object':
                for (var target in ops) {
                    if (!has(ops, target)) continue;

                    this.listenElement(node, event, target, ops[target]);
                }
                break;

            case 'string':
                if (_DEV_) {
                    if (typeof this[ops] !== 'function') {
                        console.warn('View "%s" do not have method "%s"', this.constructor.name, ops);
                    }
                }

                (function (method) {
                    view.listenElement(node, event, function () {
                        this[method]();
                    });
                })(ops);
                break;
            }
        }
    }

    function connectHelper (selector, options) {
        var view = this,
            node = view.find(selector);

        for (var prop in options) {
            if (!has(options, prop)) continue;

            connectHelperBind(prop, options[prop]);
        }

        function connectHelperBind (prop, field) {
            var event = 'change',
                propEvent = prop.split('|');

            if (propEvent.length === 2) {
                prop = propEvent[0];
                event = propEvent[1];
            }

            var target = view.has(field) ? view : view.model;

            view.listenElement(node, event, function() {
                target.set(field, node.prop(prop));
            });

            view.listenTo(target, 'change:' + field, function(model, value) {
                if (value !== node.prop(prop)) {
                    node.prop(prop, value);
                }
            });

            node.prop(prop, target.get(field));
        }
    }

    return SimpleStoreView;

    function callJquerySetterMethod (ops) {
        var options = ops.options;

        for (var name in options) {
            if (!has(options, name)) continue;

            ops.fieldName = name;
            ops.options = options[name];
            callJqueryMethod(ops);
        }
    }

    function callJqueryMethod (ops) {
        var view = ops.view,
            model = view.model,
            options = ops.options;

        ops = extend({
            model: model
        }, ops);

        switch (typeof options) {
        case 'string':
            bindEvents(options);
            break;

        case 'object':
            for (var events in options) {
                if (!has(options, events)) continue;

                bindEvents(events, options[events]);
            }
            break;

        case 'function':
            ops.value = options.apply(view, arguments);
            applyJqueryMethod(ops);
            break;

        default:
            throw new Error('Unknown options type');
        }

        function bindEvents(events, func) {
            view.bind(events, function () {
                ops.value = func ? func.apply(view, arguments) : arguments[0];
                applyJqueryMethod(ops);
            });
        }
    }

    function applyJqueryMethod (ops) {
        var node = ops.node,
            method = ops.method,
            fieldName = ops.fieldName,
            value = ops.value,
            wrapper = ops.wrapper;

        if (_DEV_) {
            if (node.length === 0) {
                console.warn('Empty node. Be sure that you set correct selector to template of ' + ops.view.constructor.name);
            }
        }

        if (wrapper) {
            value = wrapper(value);
        }

        if (ops.iteratorCallback && typeof value === 'function') {
            node.each(function (i, item) {
                if (fieldName) {
                    $(item)[method](fieldName, value(i, item));
                }
                else {
                    $(item)[method](value(i, item));
                }
            });
        }
        else if (fieldName) {
            node[method](fieldName, value);
        }
        else {
            node[method](value);
        }
    }

    function has(obj, prop) {
        return obj && obj.hasOwnProperty(prop);
    }

    function extend(target) {
        for (var i = 1, len = arguments.length, source; i < len; i++) {
            source = arguments[i];
            for (var prop in source) {
                if (!has(source, prop)) continue;

                target[prop] = source[prop];
            }
        }

        return target;
    }

    function extendDeep(target) {
        for (var i = 1, len = arguments.length, source; i < len; i++) {
            source = arguments[i];
            for (var prop in source) {
                if (!has(source, prop)) continue;

                if (source[prop] && typeof source[prop] === 'object') {
                    target[prop] = extendDeep(target[prop] || {}, source[prop]);
                }
                else {
                    target[prop] = source[prop];
                }
            }
        }

        return target;
    }

    function clone() {
        var target = {};

        for (var i = 0, len = arguments.length; i < len; i++) {
            extend(target, arguments[i]);
        }

        return target;
    }

    function cloneDeep() {
        var target = {};

        for (var i = 0, len = arguments.length; i < len; i++) {
            extendDeep(target, arguments[i]);
        }

        return target;
    }

    function objectCreate(prototype) {
        if (Object.create) return Object.create(prototype);

        var ProxyClass = function () {};
        ProxyClass.prototype = prototype;
        return new ProxyClass();
    }

    function stringToPath(path) {
        return path ? path.split('.') : [];
    }

    function mergeExtendedField(context, field, deep) {
        var viewClass = context.constructor;

        return (deep ? cloneDeep : clone).apply(null, getViewExtendedFieldList(viewClass, field, context).reverse());
    }

    function getViewExtendedFieldList(viewClass, field, context) {
        var value = viewClass.prototype[field] || {};

        if (typeof value === 'function') {
            value = value.call(context, cloneDeep);
        }

        var result = [value],
            parentProto = viewClass.__super__ || (viewClass.__proto__ && viewClass.__proto__.prototype) || Object.getPrototypeOf(viewClass.prototype);

        return parentProto ? result.concat(getViewExtendedFieldList(parentProto.constructor, field, context)) : result;
    }

}));