/**
 * @author mrdoob / http://mrdoob.com/
 */

function WebGLObjects( geometries, info ) {

	var updateList = {};

	function get( object ) {

		return geometries.get( object, object.geometry );

	}

	function update( object ) {

		var frame = info.render.frame;

		var geometry = object.geometry;
		var buffergeometry = geometries.get( object, geometry );

		// Update once per frame

		if ( updateList[ buffergeometry.id ] !== frame ) {

			if ( geometry.isGeometry ) {

				buffergeometry.updateFromObject( object );

			}

			geometries.update( buffergeometry );

			updateList[ buffergeometry.id ] = frame;

		}

		return buffergeometry;

	}

	function dispose() {

		updateList = {};

	}

	return {

		get: get,
		update: update,
		dispose: dispose

	};

}


export { WebGLObjects };
