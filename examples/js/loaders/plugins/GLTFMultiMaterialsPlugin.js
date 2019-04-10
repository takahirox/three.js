THREE.GLTFMultiMaterialsPlugin = ( function () {

	var Plugin = THREE.GLTFLoader.Plugin;

	function GLTFMultiMaterialsPlugin() {

		Plugin.call( this, 'THREE_multi_materials' );

	}

	GLTFMultiMaterialsPlugin.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: GLTFMultiMaterialsPlugin,

		onAfterMesh: function ( mesh, meshDef, parser ) {

			if ( ! mesh.isGroup ) return mesh;

			var group = mesh;

			var geometry = group.children[ 0 ].geometry;
			var attributes = geometry.attributes;

			var canBeCombined = !! geometry.index;

			for ( var i = 1, il = group.children.length; i < il; i ++ ) {

				var child = group.children[ i ];
				var geometry2 = child.geometry;
				var attributes2 = geometry2.attributes;

				if ( Object.keys( attributes ).length !== Object.keys( attributes2 ).length ) {

					canBeCombined = false;
					break;

				}

				for ( var key in attributes ) {

					if ( attributes[ key ] !== attributes2[ key ] ) {

						canBeCombined = false;
						break;

					}

				}

				canBeCombined = canBeCombined && !! geometry2.index;

			}

			if ( ! canBeCombined ) return mesh;

			var newGeometry = new THREE.BufferGeometry();

			for ( var key in attributes ) {

				newGeometry.addAttribute( key, attributes[ key ] );

			}

			var materials = [];
			var indices = [];
			var offset = 0;

			for ( var i = 0, il = group.children.length; i < il; i ++ ) {

				var child = group.children[ i ];

				materials.push( child.material );

				var index = child.geometry.index;
				var array = index.array;

				for ( var j = 0, jl = array.length; j < jl; j ++ ) {

					indices.push( array[ j ] );

				}

				newGeometry.addGroup( offset, array.length, i );

				offset += array.length;

			}

			newGeometry.setIndex( new THREE.BufferAttribute( new Uint16Array( indices ), 1 ) );

			var newMesh = new group.children[ 0 ].constructor(
				newGeometry,
				materials
			);

			console.log( newMesh );

			return newMesh;

		}

	} );

	return GLTFMultiMaterialsPlugin;

}() );
