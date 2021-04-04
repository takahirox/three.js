function WebGLAttributes( gl, capabilities ) {

	const isWebGL2 = capabilities.isWebGL2;

	const buffers = new WeakMap();

	function getGLType( attribute, array ) {

		if ( array instanceof Float32Array ) {

			return gl.FLOAT;

		} else if ( array instanceof Float64Array ) {

			console.warn( 'THREE.WebGLAttributes: Unsupported data buffer format: Float64Array.' );

		} else if ( array instanceof Uint16Array ) {

			if ( attribute.isFloat16BufferAttribute ) {

				if ( isWebGL2 ) {

					return gl.HALF_FLOAT;

				} else {

					console.warn( 'THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.' );

				}

			} else {

				return gl.UNSIGNED_SHORT;

			}

		} else if ( array instanceof Int16Array ) {

			return gl.SHORT;

		} else if ( array instanceof Uint32Array ) {

			return gl.UNSIGNED_INT;

		} else if ( array instanceof Int32Array ) {

			return gl.INT;

		} else if ( array instanceof Int8Array ) {

			return gl.BYTE;

		} else if ( array instanceof Uint8Array ) {

			return gl.UNSIGNED_BYTE;

		}

		return gl.FLOAT;

	}

	function createBuffer( attribute, bufferType ) {

		const array = attribute.array;
		const usage = attribute.usage;

		const buffer = gl.createBuffer();

		gl.bindBuffer( bufferType, buffer );
		gl.bufferData( bufferType, array, usage );

		attribute.onUploadCallback();

		return {
			buffer: buffer,
			type: getGLType( attribute, array ),
			bytesPerElement: array.BYTES_PER_ELEMENT,
			version: attribute.version
		};

	}

	function updateBuffer( buffer, attribute, bufferType ) {

		const array = attribute.array;
		const updateRange = attribute.updateRange;

		gl.bindBuffer( bufferType, buffer );

		if ( updateRange.count === - 1 ) {

			// Not using update ranges

			gl.bufferSubData( bufferType, 0, array );

		} else {

			if ( isWebGL2 ) {

				gl.bufferSubData( bufferType, updateRange.offset * array.BYTES_PER_ELEMENT,
					array, updateRange.offset, updateRange.count );

			} else {

				gl.bufferSubData( bufferType, updateRange.offset * array.BYTES_PER_ELEMENT,
					array.subarray( updateRange.offset, updateRange.offset + updateRange.count ) );

			}

			updateRange.count = - 1; // reset range

		}

	}

	//

	function get( attribute ) {

		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		return buffers.get( attribute );

	}

	function remove( attribute ) {

		if ( attribute.isInterleavedBufferAttribute2 ) {

			const data = buffers.get( attribute );

			if ( data ) {

				buffers.delete( attribute );

				data.data.count --;

				if ( data.data.count === 0 ) {

					buffers.delete( attribute.data );

					gl.deleteBuffer( data.data.buffer );

				}

			}

			return;

		}

		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		const data = buffers.get( attribute );

		if ( data ) {

			gl.deleteBuffer( data.buffer );

			buffers.delete( attribute );

		}

	}

	function update( attribute, bufferType ) {

		if ( attribute.isGLBufferAttribute ) {

			const cached = buffers.get( attribute );

			if ( ! cached || cached.version < attribute.version ) {

				buffers.set( attribute, {
					buffer: attribute.buffer,
					type: attribute.type,
					bytesPerElement: attribute.elementSize,
					version: attribute.version
				} );

			}

			return;

		}

		if ( attribute.isInterleavedBufferAttribute2 ) {

			let data = buffers.get( attribute.data );

			if ( data === undefined ) {

				data = createBuffer( attribute.data, bufferType );
				buffers.set( attribute.data, data );

			} else if ( data.version < attribute.data.version ) {

				updateBuffer( data.data.buffer, attribute.data, bufferType );

				data.version = attribute.version;

			}

			if ( ! buffers.has( attribute ) ) {

				if ( data.count === undefined ) data.count = 0; // reference count
				data.count ++;

				buffers.set( attribute, {
					buffer: data.buffer,
					data: data,
					type: getGLType( attribute, attribute.array ),
				} );

			}

			return;

		}

		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		const data = buffers.get( attribute );

		if ( data === undefined ) {

			buffers.set( attribute, createBuffer( attribute, bufferType ) );

		} else if ( data.version < attribute.version ) {

			updateBuffer( data.buffer, attribute, bufferType );

			data.version = attribute.version;

		}

	}

	return {

		get: get,
		remove: remove,
		update: update

	};

}


export { WebGLAttributes };
