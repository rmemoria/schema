var assert = require('assert');
var Schema = require('../src'),
    Types = Schema.types;

describe('Custom validators', () => {

    it('Validators called', () => {
        let schemaSingleCalled = false;
        let schemaMultiCalled = false;
        let propSingleCalled = false;
        let propMultiCalled = false;

        const sc = Schema.create({
            name: Types.string()
                .validIf(() => {
                    propSingleCalled = true;
                    return true;
                })
                .validIf(() => {
                    propMultiCalled = true;
                    return true;
                })
        })
            .validIf(() => {
                schemaSingleCalled = true;
                return true;
            })
            .validIf(() => {
                schemaMultiCalled = true;
                return true;
            });

        return sc.validate({ name: 'Ricardo' })
            .then(() => {
                assert(schemaSingleCalled);
                assert(propSingleCalled);
                assert(schemaMultiCalled);
                assert(propMultiCalled);
            });
    });


    it('Failed validation', () => {
        const sc = Schema.create({
            name: Types.string()
                .validIf(name => name !== 'vancouver')
                .withErrorCode('INVALID_NAME')
        });

        // first check a valid value
        return sc.validate({ name: 'rio de janeiro' })
            .then(() => {
                // now check an invalid value
                return sc.validate({ name: 'vancouver' });
            })
            .then(() => {
                assert.fail('Validation should have failed');
            })
            .catch(errs => {
                assert.equal(errs.length, 1);
                const err = errs[0];
                assert.equal(err.property, 'name');
                assert.equal(err.code, 'INVALID_NAME');
            });
    });

    it('Custom validator in schema', () => {
        const errmsg = 'Name cannot be vancouver';
        const sc = Schema.create({
            name: Types.string()
        })
            .validIf(doc => doc.name !== 'vancouver')
            .withErrorMessage(errmsg)
            .withErrorCode('INVALID_NAME');

        return sc.validate({ name: 'vancouver' })
            .catch(errs => {
                assert.equal(errs.length, 1);
                const err = errs[0];
                assert.equal(err.property, null);
                assert.equal(err.message, errmsg);
                assert.equal(err.code, 'INVALID_NAME');
            });
    });

    it('Skip custom validator in case of invalid property', () => {
        const sc = Schema.create({
            name: Types.string()
                .notNull()
                .validIf(name => name != 'vancouver')
        });

        return sc.validate({ name: null })
            .catch(errs => {
                assert(errs);
                assert.equal(errs.length, 1);
                const err = errs[0];
                assert.equal(err.property, 'name');
                assert.equal(err.code, 'NOT_NULL');
            });
    });

    it('Simple function validator', () => {
        const errmsg = 'Cannot be Vancouver';
        const sc = Schema.create({
            name: Types.string()
                .validIf((v, doc) => doc.name.toLowerCase() != 'vancouver')
                .withErrorMessage(errmsg)
        });

        return sc.validate({ name: 'Rio' })
            .then(() => {
                return sc.validate({ name: 'Vancouver' });
            })
            .catch(errs => {
                assert(errs);
                const err = errs[0];
                assert.equal(err.property, 'name');
                assert.equal(err.message, errmsg);
                assert.equal(err.code, 'INVALID');
            });
    });

    it('Register/use/unregister validator', () => {
        const errMsg = 'Value must be less than 10';

        Schema.validators.register('smallNumber', 
            value => value > 10 ? errMsg : null);
        
        const schema = Schema.create({
            value: Types.number().validIf('smallnumber')
        });

        return schema.validate({ value: 20 })
            .catch(errs => {
                assert(errs);
                assert.equal(errs.length, 1);
                const err = errs[0];
                assert.equal(err.property, 'value');
                assert.equal(err.message, errMsg);

                // check if get returns the validator
                assert(Schema.validators.get('smallNumber'));

                // unregister and test if it was removed
                Schema.validators.unregister('smallNumber');
                assert(!Schema.validators.get('smallNumber'));

                // test validation of the schema without the validator
                // it must generate an unexpected error
                return schema.validate({ value: 20 });
            })
            .catch(err => {
                assert(err instanceof Error);
            });
    });

    it('Register complex validator', () => {
        Schema.validators
            .register('smallNumber', value => value <= 10)
            .withErrorCode('NOT_SMALL_NUMBER');

        const schema = Schema.create({
            value: Types.number().validIf('smallNumber')
        });

        return schema.validate({ value: 20 })
            .catch(errs => {
                assert(errs);
                assert.equal(errs.length, 1);
                const err = errs[0];
                assert.equal(err.property, 'value');
                assert(err.message);
                assert.equal(err.code, 'NOT_SMALL_NUMBER');

                // just check if error will not be registered in valid values
                return schema.validate({ value: 10 });
            })
            .then(res => {
                assert(res);
                assert.equal(res.value, 10);
            });
    });

    it('Multiple validators', () => {
        const schema = Schema.create({
            value: Types.number()
                .validIf(val => val < 20)
                .withErrorMessage('Must be lower than 20')
                .validIf(val => val < 10)
                .withErrorMessage('Must be lower than 10')
                .validIf(val => val < 8)
                .withErrorMessage('Must be lower than 8')
        });

        // caught in the 1st validator
        return schema.validate({ value : 20 })
            .catch(errs => {
                assert(errs);
                assert(errs.length, 1);
                const err = errs[0];
                assert.equal(err.property, 'value');
                assert.equal(err.message, 'Must be lower than 20');

                // caught in the 2nd validator
                return schema.validate({ value: 15 });
            })
            .catch(errs => {
                const err = errs[0];
                assert.equal(err.property, 'value');
                assert.equal(err.message, 'Must be lower than 10');

                // caugth in the 3rd validator
                return schema.validate({ value: 9 });
            })
            .catch(errs => {
                const err = errs[0];
                assert.equal(err.property, 'value');
                assert.equal(err.message, 'Must be lower than 8');

                // now will pass by the 3 validators
                return schema.validate({ value: 5 });
            })
            .then(res => {
                assert(res);
                assert.equal(res.value, 5);
            });
    });


    it('Resolve message from function (Localization)', () => {
        const schema = Schema.create({
            val: Types.string()
        })
            .validIf(() => false)
            // this method allows a message to be resolved from an external
            // function, like a localized message resolver
            .withErrorMessage(() => 'LOCALIZED MESSAGE');

        return schema.validate({ val: 'Hi' })
            .catch(errs => {
                assert(errs);
                assert.equal(errs.length, 1);
                const err = errs[0];
                assert.equal(err.message, 'LOCALIZED MESSAGE');
            });
    });
});
