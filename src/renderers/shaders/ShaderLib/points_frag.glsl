uniform vec3 diffuse;
uniform float opacity;

varying vec3 vViewPosition;

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars>

struct PointsMaterial {

	vec3	diffuseColor;

};

#include <shadowmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = vec3( 0.0 );

	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>

#ifdef USE_LIGHTS

	vec3 normal = vec3( 1.0 );

	// accumulation

	PointsMaterial material;
	material.diffuseColor = diffuseColor.rgb;

	GeometricContext geometry;

	geometry.position = - vViewPosition;

	IncidentLight directLight;

#if ( NUM_POINT_LIGHTS > 0 )

	PointLight pointLight;
	vec3 irradiance;

	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

		pointLight = pointLights[ i ];

		getPointDirectLightIrradiance( pointLight, geometry, directLight );

		irradiance = directLight.color;

		reflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );

	}

#endif

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

#else

	vec3 outgoingLight = diffuseColor.rgb;

#endif

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>

}
