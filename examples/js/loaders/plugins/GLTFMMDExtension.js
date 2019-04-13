THREE.GLTFMMDExtensionPlugin = ( function () {

	var Plugin = THREE.GLTFLoader.Plugin;

	function GLTFMMDExtensionPlugin() {

		Plugin.call( this, 'EXT_MMD' );

	}

	GLTFMMDExtensionPlugin.prototype = Object.assign( Object.create( Plugin.prototype ), {

		constructor: GLTFMMDExtensionPlugin,

		onAfterMesh: function ( mesh, meshDef, parser ) {

			if ( ! mesh.isSkinnedMesh ) return mesh;

			var primitiveDefs = meshDef.primitives;
			var primitiveDef = primitiveDefs[ 0 ];

			var extensions = primitiveDef.extensions;

			if ( ! extensions || ! extensions[ this.name ] ) {

				return mesh;

			}

			mesh.geometry.userData.MMD = extensions[ this.name ];

			return mesh;

		}

	} );

	return GLTFMMDExtensionPlugin;

} )();
