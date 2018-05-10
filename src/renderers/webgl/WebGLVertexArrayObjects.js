/**
 * @author takahiro / http://github.com/takahirox
 */

function WebGLVertexArrayObjects( gl, state, extensions ) {

	var ext = extensions.get( 'OES_vertex_array_object' );
	var objects = new WeakMap();
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
			index: null
		};

	}

	function getObject( material, geometry ) {

		if ( ! objects.has( material ) ) {

			objects.set( material, new WeakMap() );

		}

		if ( ! objects.get( material ).has( geometry ) ) {

			objects.get( material )
				.set( geometry, createObject( true ) );

		}

		return objects.get( material ).get( geometry );

	}

	function bind( material, geometry ) {

		if ( ext === null ) return;

		var object = getObject( material, geometry )
		ext.bindVertexArrayOES( object.object );
		currentObject = object;

	}

	function unbind() {

		if ( ext === null ) return;

		ext.bindVertexArrayOES( null );
		currentObject = defaultObject;

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

		if ( ! attribute.enabled ) gl.enableVertexAttribArray( programAttribute );

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
		enableAttribute: enableAttribute,
		enableAttributeAndDivisor: enableAttributeAndDivisor,
		enableIndex: enableIndex,
		initAttributes: initAttributes,
		disableUnusedAttributes: disableUnusedAttributes

	}

}


export { WebGLVertexArrayObjects };
