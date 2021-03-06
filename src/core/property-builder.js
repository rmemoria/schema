const Utils = require('../commons/utils');
const ValidatorBuilder = require('../impl/validator-builder');

module.exports = class PropertyBuilder {

    constructor(type) {
        this.schema = {
            type: type
        };
    }

    notNull(val) {
        this.schema.notNull = val;
        if (val !== undefined && typeof val !== 'boolean' && typeof val !== 'function') {
            throw new Error('Invalid value for notNull function');
        }

        if (val === undefined) {
            this.schema.notNull = true;
        } else {
            this.schema.notNull = val;
        }
        return this;
    }

    label(val) {
        this.schema.label = val;
        return this;
    }

    description(val) {
        this.schema.description = val;
        return this;
    }

    validIf(func) {
        this.schema.validators = this.schema.validators || [];

        const builder = new ValidatorBuilder(this);
        const validator = builder.bind(func);
        this.schema.validators.push(validator);
        return this;
    }

    defaultValue(val) {
        if (Utils.isEmpty(val)) {
            throw new Error('Invalid default value. Expected a value');
        }

        this.schema.defaultValue = val;

        return this;
    }

    /**
     * Add a converter to be called before the validation of the property
     * @param {Function|String} func The function to convert or registered converted string name
     */
    convertBefore(func) {
        validateConverter(func);

        this.schema.convertersBefore = this.convertersBefore || [];
        this.schema.convertersBefore.push(func);

        return this;
    }

    /**
     * Add a converter to be called after the validation of the property
     * @param {Function|String} func the converter function
     */
    convertAfter(func) {
        validateConverter(func);

        this.schema.convertersAfter = this.schema.convertersAfter || [];
        this.schema.convertersAfter.push(func);

        return this;
    }

    /**
     * Return the list of possible values for the property
     * @param {Function|Array} val the array of possible values
     */
    options(val) {
        this.schema.options = val;
        return this;
    }
};

function validateConverter(conv) {
    if (!Utils.isFunction(conv) && !Utils.isString(conv)) {
        throw new Error('Invalid value for converter. ' +
            'Expected function or registered converter name');
    }
}
