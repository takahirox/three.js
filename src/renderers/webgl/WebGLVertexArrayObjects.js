/**
 * @author takahiro / http://github.com/takahirox
 */

function WebGLVertexArrayObjects( gl, state, extensions ) {

	var ext = extensions.get( 'OES_vertex_array_object' );
	var objects = {};
	var maxVertexAttributes = gl.getParameter( gl.MAX_VERTEX_ATTRIBS );

	var defaultObject = createObject( false );
	var currentObject = defaultObject;

	function createObject( makeArray ) {

		var attributes = [];

		for ( var i = 0; i < maxVertexAttributes; i ++ ) {

			attributes.push( {
				buffer: null,
				size: null,
				type: null,
				normalized: null,
				stride: null,
				offset: null,
				divisor: null,
				enabled: false,
				used: false
			} );

		}

		return {
			object: makeArray ? ext.createVertexArrayOES() : null,
			attributes: attributes,
			index: null,
			version: - 1
		};

	}

	function getObject( geometryProgram ) {

		if ( objects[ geometryProgram ] === undefined ) {

			objects[ geometryProgram ] = createObject( true );

		}

		return objects[ geometryProgram ];

	}

	function bind( geometryProgram ) {

		if ( ext === null ) return;

		var object = getObject( geometryProgram )

		if ( currentObject === object ) return;

		ext.bindVertexArrayOES( object.object );
		currentObject = object;

	}

	function unbind() {

		if ( ext === null || currentObject === defaultObject ) return;

		ext.bindVertexArrayOES( null );
		currentObject = defaultObject;

	}

	function needsSetup( geometry, program ) {

		if ( ext === null ) return true;

		return currentObject.version !== geometry.version;

	}

	function saveVersion( geometry ) {

		if ( ext === null ) return;

		currentObject.version = geometry.version;

	}

	function bindAndBufferData( bufferType, buffer, array, usage ) {

		if ( ext !== null && bufferType === gl.ELEMENT_ARRAY_BUFFER ) {

			if ( currentObject !== defaultObject ) {

				ext.bindVertexArrayOES( null );

			}

			defaultObject.index = buffer;

		}

		gl.bindBuffer( bufferType, buffer );
		gl.bufferData( bufferType, array, usage );

		if ( ext !== null && currentObject !== defaultObject &&
			bufferType === gl.ELEMENT_ARRAY_BUFFER ) {

			ext.bindVertexArrayOES( currentObject.object );

		}

	}

	function bindAndBufferSubData( bufferType, buffer, offset, array ) {

		if ( ext !== null && bufferType === gl.ELEMENT_ARRAY_BUFFER ) {

			if ( currentObject !== defaultObject ) {

				ext.bindVertexArrayOES( null );

			}

			defaultObject.index = buffer;

		}

		gl.bindBuffer( bufferType, buffer );
		gl.bufferSubData( bufferType, offset, array );

		if ( ext !== null && currentObject !== defaultObject &&
			bufferType === gl.ELEMENT_ARRAY_BUFFER ) {

			ext.bindVertexArrayOES( currentObject.object );

		}

	}

	function onDispose( geometryProgram ) {

		delete objects[ geometryProgram ];

	}

	function needsUpdate( index, buffer, size, type, normalized, stride, offset ) {

		var attribute = currentObject.attributes[ index ]

		if ( ! attribute.enabled ||
			attribute.buffer !== buffer ||
			attribute.size !== size ||
			attribute.type !== type ||
			attribute.normalized !== normalized ||
			attribute.stride !== stride ||
			attribute.offset !== offset ) return true;

		return false;

	}

	function update( index, buffer, size, type, normalized, stride, offset ) {

		var attribute = currentObject.attributes[ index ]

		attribute.buffer = buffer;
		attribute.size = size;
		attribute.type = type;
		attribute.normalized = normalized;
		attribute.stride = stride;
		attribute.offset = offset;

		gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
		gl.vertexAttribPointer( index, size, type, normalized, stride, offset );

	}

	function enableAttribute( programAttribute, buffer, size, type, normalized, stride, offset ) {

		enableAttributeAndDivisor( programAttribute, 0, buffer, size, type, normalized, stride, offset );

	}

	function enableAttributeAndDivisor( programAttribute, meshPerAttribute, buffer, size, type, normalized, stride, offset ) {

		var attribute = currentObject.attributes[ programAttribute ];

		if ( ! attribute.enabled ) {

			gl.enableVertexAttribArray( programAttribute );
			attribute.enabled = true;

		}

		if ( attribute.divisors !== meshPerAttribute ) {

			extensions.get( 'ANGLE_instanced_arrays' ).vertexAttribDivisorANGLE( programAttribute, meshPerAttribute );
			attribute.divisor = meshPerAttribute;

		}

		attribute.used = true;

		if ( needsUpdate( programAttribute, buffer, size, type, normalized, stride, offset ) ) {

			update( programAttribute, buffer, size, type, normalized, stride, offset );

		}

	}

	function enableIndex( buffer ) {

		if ( buffer !== currentObject.index ) {

			gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, buffer );

			currentObject.index = buffer;

		}

	}

	function initAttributes() {

		for ( var i = 0; i < maxVertexAttributes; i ++ ) {

			var attribute = currentObject.attributes[ i ];
			attribute.used = false;

		}

	}

	function disableUnusedAttributes() {

		for ( var i = 0; i < maxVertexAttributes; i ++ ) {

			var attribute = currentObject.attributes[ i ];

			if ( attribute.enabled && ! attribute.used ) {

				gl.disableVertexAttribArray( i );
				attribute.enabled = false;

			}

		}

	}


	return {

		bind: bind,
		unbind: unbind,
		needsSetup: needsSetup,
		saveVersion: saveVersion,
		bindAndBufferData: bindAndBufferData,
		bindAndBufferSubData: bindAndBufferSubData,
		enableAttribute: enableAttribute,
		enableAttributeAndDivisor: enableAttributeAndDivisor,
		enableIndex: enableIndex,
		initAttributes: initAttributes,
		disableUnusedAttributes: disableUnusedAttributes

	}

}


export { WebGLVertexArrayObjects };
