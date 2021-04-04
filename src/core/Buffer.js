import { MathUtils } from '../math/MathUtils.js';
import { StaticDrawUsage } from '../constants.js';

function Buffer( buffer ) {

	this.buffer = buffer;
	this.array = new Uint8Array( this.buffer );

	this.usage = StaticDrawUsage;
	this.updateRange = { offset: 0, count: - 1 };

	this.version = 0;

	this.uuid = MathUtils.generateUUID();

}

Object.defineProperty( Buffer.prototype, 'needsUpdate', {

	set: function ( value ) {

		if ( value === true ) this.version ++;

	}

} );

Object.assign( Buffer.prototype, {

	isBuffer: true,

	onUploadCallback: function () {},

	setUsage: function ( value ) {

		this.usage = value;

		return this;

	},

	copy: function ( source ) {

		this.buffer = source.buffer.slice();
		this.array = new Uint8Array( this.buffer );
		this.stride = source.stride;
		this.usage = source.usage;

		return this;

	},

	clone: function ( data ) {

		if ( data.arrayBuffers === undefined ) {

			data.arrayBuffers = {};

		}

		if ( this.buffer._uuid === undefined ) {

			this.buffer._uuid = MathUtils.generateUUID();

		}

		if ( data.arrayBuffers[ this.buffer._uuid ] === undefined ) {

			data.arrayBuffers[ this.buffer._uuid ] = this.buffer.slice();

		}

		const buffer = new Buffer( data.arrayBuffers[ this.buffer._uuid ] );
		buffer.setUsage( this.usage );

		return buffer;

	},

	onUpload: function ( callback ) {

		this.onUploadCallback = callback;

		return this;

	},

	toJSON: function ( data ) {

		if ( data.arrayBuffers === undefined ) {

			data.arrayBuffers = {};

		}

		// generate UUID for array buffer if necessary

		if ( this.buffer._uuid === undefined ) {

			this.buffer._uuid = MathUtils.generateUUID();

		}

		if ( data.arrayBuffers[ this.buffer._uuid ] === undefined ) {

			data.arrayBuffers[ this.buffer._uuid ] = Array.prototype.slice.call( new Uint32Array( this.buffer ) );

		}

		//

		return {
			uuid: this.uuid,
			buffer: this.buffer._uuid
		};

	}

} );

export { Buffer };
