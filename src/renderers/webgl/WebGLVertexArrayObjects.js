/**
 * @author takahiro / http://github.com/takahirox
 */

function WebGLVertexArrayObjects( gl, state, extensions ) {

	var ext = extensions.get( 'OES_vertex_array_object' );
	var objects = new WeakMap();

	function getObject( material, geometry ) {

		if ( ! objects.has( material ) ) {

			objects.set( material, new WeakMap() );

		}

		if ( ! objects.get( material ).has( geometry ) ) {

			objects.get( material )
				.set( geometry, ext.createVertexArrayOES() );

		}

		return objects.get( material ).get( geometry );

	}

	this.bind = function ( material, geometry ) {

		if ( ext === null ) return;

		ext.bindVertexArrayOES( getObject( material, geometry ) );

		state.initAttributes();
		state.disableUnusedAttributes();

	};

	this.needsUpdate = function ( material, geometry ) {

		return true;

	};

	this.unbind = function () {

		if ( ext === null ) return;

		ext.bindVertexArrayOES( null );

	};

}


export { WebGLVertexArrayObjects };
