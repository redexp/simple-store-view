var expect = require('chai').expect;
var sinon = require('sinon');

require('chai').use(require('sinon-chai'));

var View = require('../simple-store-view');
var Store = require('simple-state-store');

describe('SimpleStoreView', function () {

    it('should listen and trigger events in store', function () {
        var store = new Store({
            users: []
        });

        var view = new View({
            store: store,
            statePath: 'usersView'
        });

        var storeCallback = sinon.spy();
        store.on('test', 'usersView', storeCallback);

        var viewCallback = sinon.spy();
        view.on('test', viewCallback);

        view.trigger('test', 'one');

        expect(storeCallback)
            .to.have.been.callCount(1)
            .and.have.been.calledWith('one')
        ;

        expect(viewCallback)
            .to.have.been.callCount(1)
            .and.have.been.calledWith('one')
        ;
    });

    it('should stop listening events in store', function () {
        var store = new Store({
            users: []
        });

        var view = new View({
            store: store,
            statePath: 'usersView'
        });

        var viewTest1Callback = sinon.spy();
        view.on('test', viewTest1Callback);

        var viewTest2Callback = sinon.spy();
        view.on('test', viewTest2Callback);

        view.off('test', viewTest1Callback);
        view.trigger('test');

        expect(viewTest1Callback).to.have.been.callCount(0);
        expect(viewTest2Callback).to.have.been.callCount(1);

        view.off('test');
        view.trigger('test');

        expect(viewTest1Callback).to.have.been.callCount(0);
        expect(viewTest2Callback).to.have.been.callCount(1);

        var viewTest3Callback = sinon.spy();
        view.on('test3', viewTest3Callback);

        view.trigger('test3');
        view.off();
        view.trigger('test3');

        expect(viewTest3Callback).to.have.been.callCount(1);
    });
    
    it('should extend views', function () {
        var store = new Store();

        var Test1View = View.extend({
            ui: {
                'ui1': 'div'
            },

            template: {
                'test1': {}
            }
        });

        var Test2View = Test1View.extend({
            ui: {
                'ui2': 'span'
            },

            template: {
                'test2': {}
            }
        });

        var view = new Test2View({
            store: store,
            statePath: 'view'
        });

        expect(view.ui).to.have.property('ui1');
        expect(view.ui).to.have.property('ui2');

        expect(view.template).to.deep.equal({
            test1: {},
            test2: {}
        });
    });

});