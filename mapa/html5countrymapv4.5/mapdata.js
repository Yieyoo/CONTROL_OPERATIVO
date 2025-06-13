var simplemaps_countrymap_mapdata={
  main_settings: {
   //General settings
    width: "responsive", //'700' or 'responsive'
    background_color: "#FFFFFF",
    background_transparent: "yes",
    border_color: "#ffffff",
    
    //State defaults
    state_description: "",
    state_color: "#691932",
    state_hover_color: "#305c4c",
    state_url: "",
    border_size: 1.5,
    all_states_inactive: "no",
    all_states_zoomable: "yes",
    
    //Location defaults
    location_description: "Location description",
    location_url: "",
    location_color: "#FF0067",
    location_opacity: 0.8,
    location_hover_opacity: 1,
    location_size: 25,
    location_type: "square",
    location_image_source: "frog.png",
    location_border_color: "#FFFFFF",
    location_border: 2,
    location_hover_border: 2.5,
    all_locations_inactive: "no",
    all_locations_hidden: "no",
    
    //Label defaults
    label_color: "#ffffff",
    label_hover_color: "#ffffff",
    label_size: 12,
    label_font: "Arial",
    label_display: "auto",
    label_scale: "yes",
    hide_labels: "no",
    hide_eastern_labels: "no",
   
    //Zoom settings
    zoom: "yes",
    manual_zoom: "yes",
    back_image: "no",
    initial_back: "no",
    initial_zoom: "-1",
    initial_zoom_solo: "no",
    region_opacity: 1,
    region_hover_opacity: 0.6,
    zoom_out_incrementally: "yes",
    zoom_percentage: 0.99,
    zoom_time: 0.5,
    
    //Popup settings
    popup_color: "white",
    popup_opacity: 0.9,
    popup_shadow: 1,
    popup_corners: 5,
    popup_font: "12px/1.5 Verdana, Arial, Helvetica, sans-serif",
    popup_nocss: "no",
    
    //Advanced settings
    div: "map",
    auto_load: "yes",
    url_new_tab: "no",
    images_directory: "default",
    fade_time: 0.1,
    link_text: "View Website",
    popups: "detect",
    state_image_url: "",
    state_image_position: "",
    location_image_url: ""
    
  },
  state_specific: {
    MXAGU: {
      name: "Aguascalientes",
      url: "estados/aguascalientes/aguascalientesindex.html",
      hover_label: "Aguascalientes", // Nombre que aparecerá en el hover
      state_image_url: "../../fotos/titularagu.png"  // Imagen que aparece en hover
    },
    MXBCN: {
      name: "Baja California",
      url: "estados/baja_california/baja_californiaindex.html",
      hover_label: "Baja California"
    },
    MXBCS: {
      name: "Baja California Sur",
      url: "estados/baja_california_s/baja_california_surindex.html",
      hover_label: "Baja California Sur"
    },
    MXCHH: {
      name: "Chihuahua",
      url: "estados/chihuahua/chihuahuaindex.html",
      hover_label: "Chihuahua"
    },
    MXCAM: {
      name: "Campeche",
      url: "estados/campeche/campecheindex.html",
      hover_label: "Campeche" 
    },
    MXCOA: {
      name: "Coahuila",
      url: "estados/coahuila/coahuilaindex.html",
      hover_label: "Coahuila"
    },
    MXCOL: {
      name: "Colima",
      url: "estados/colima/colimaindex.html",
      hover_label: "Colima"
    },
    MXCHP: {
      name: "Chiapas",
      url: "estados/chiapas/chiapasindex.html",
      hover_label: "Chiapas"
    },
    MXDUR: {
      name: "Durango",
      url: "estados/durango/durangoindex.html"
    },
    MXGUA: {
      name: "Guanajuato",
      url: "estados/guanajuato/guanajuatoindex.html"
    },
    MXGRO: {
      name: "Guerrero",
      url: "estados/guerrero/guerreroindex.html"
    },
    MXHID: {
      name: "Hidalgo",
      url: "estados/hidalgo/hidalgoindex.html"
    },
    MXJAL: {
      name: "Jalisco",
      url: "estados/jalisco/jaliscoindex.html"
    },
    MXCMX: {
      name: "Ciudad de México",
      url: "estados/cdmx/cdmxindex.html"
    },
    MXMEX: {
      name: "Estado de México",
      url: "estados/edomex/edomexindex.html"
    },
    MXMOR: {
      name: "Morelos",
      url: "estados/morelos/morelosindex.html"
    },
    MXNAY: {
      name: "Nayarit",
      url: "estados/nayarit/nayaritindex.html"
    },
    MXNLE: {
      name: "Nuevo León",
      url: "estados/nuevo_leon/nuevolindex.html"
    },
    MXOAX: {
      name: "Oaxaca",
      url: "estados/oaxaca/oaxacaindex.html"
    },
    MXPUE: {
      name: "Puebla",
      url: "estados/puebla/pueblaindex.html"
    },
    MXQUE: {
      name: "Querétaro",
      url: "estados/queretaro/queretaroindex.html"
    },
    MXROO: {
      name: "Quintana Roo",
      url: "estados/quintanaroo/quintanarooindex.html"
    },
    MXSLP: {
      name: "San Luis Potosí",
      url: "estados/san_luis/san_luisindex.html"
    },
    MXSIN: {
      name: "Sinaloa",
      url: "estados/sinaloa/sinaloaindex.html"
    },
    MXSON: {
      name: "Sonora",
      url: "estados/sonora/sonoraindex.html"
    },
    MXTAB: {
      name: "Tabasco",
      url: "estados/tabasco/tabascoindex.html"
    },
    MXTAM: {
      name: "Tamaulipas",
      url: "estados/tamaulipas/tamaulipasindex.html"
    },
    MXTLA: {
      name: "Tlaxcala",
      url: "estados/tlaxcala/tlaxcalaindex.html"
    },
    MXVER: {
      name: "Veracruz",
      url: "estados/veracruz/veracruzindex.html"
    },
    MXYUC: {
      name: "Yucatán",
      url: "estados/yucatan/yucatanindex.html"
    },
    MXZAC: {
      name: "Zacatecas",
      url: "estados/zacatecas/zacatecasindex.html"
    },
    MXMIC: {
      name: "Michoacán",
      url: "estados/michoacan/michoacanindex.html"
  }
},
locations: {},
labels: {
  MXAGU: {
    name: "Aguascalientes",
    parent_id: "MXAGU"
  },
  MXBCN: {
    name: "Baja California",
    parent_id: "MXBCN"
  },
  MXBCS: {
    name: "Baja California Sur",
    parent_id: "MXBCS"
  },
  MXCAM: {
    name: "Campeche",
    parent_id: "MXCAM",
    x: 858.2,
    y: 475.9
  }
  ,
  MXCHH: {
    name: "Chihuahua",
    parent_id: "MXCHH"
  },
  MXCHP: {
    name: "Chiapas",
    parent_id: "MXCHP"
  },
  MXCMX: {
    name: "Ciudad de México",
    parent_id: "MXCMX",
    x: 596.8,
    y: 459.4
  }
  ,
  MXCOA: {
    name: "Coahuila",
    parent_id: "MXCOA"
  },
  MXCOL: {
    name: "Colima",
    parent_id: "MXCOL",
    x: 461.4,
    y: 463.7
  }
  ,
  MXDUR: {
    name: "Durango",
    parent_id: "MXDUR"
  },
  MXGRO: {
    name: "Guerrero",
    parent_id: "MXGRO"
  },
  MXGUA: {
    name: "Guanajuato",
    parent_id: "MXGUA"
  },
  MXHID: {
    name: "Hidalgo",
    parent_id: "MXHID"
  },
  MXJAL: {
    name: "Jalisco",
    parent_id: "MXJAL"
  },
  MXMEX: {
    name: "Estado de México",
    parent_id: "MXMEX"
  },
  MXMIC: {
    name: "Michoacán",
    parent_id: "MXMIC"
  },
  MXMOR: {
    name: "Morelos",
    parent_id: "MXMOR"
  },
  MXNAY: {
    name: "Nayarit",
    parent_id: "MXNAY"
  },
  MXNLE: {
    name: "Nuevo León",
    parent_id: "MXNLE"
  },
  MXOAX: {
    name: "Oaxaca",
    parent_id: "MXOAX"
  },
  MXPUE: {
    name: "Puebla",
    parent_id: "MXPUE",
    x: 626.1,
    y: 479.6
  }
   ,
  MXQUE: {
    name: "Querétaro",
    parent_id: "MXQUE"
  },
  MXROO: {
    name: "Quintana Roo",
    parent_id: "MXROO"
  },
  MXSIN: {
    name: "Sinaloa",
    parent_id: "MXSIN"
  },
  MXSLP: {
    name: "San Luis Potosí",
    parent_id: "MXSLP",
    x: 556.2,
    y: 364.9
  }
  ,
  MXSON: {
    name: "Sonora",
    parent_id: "MXSON"
  },
  MXTAB: {
    name: "Tabasco",
    parent_id: "MXTAB"
  },
  MXTAM: {
    name: "Tamaulipas",
    parent_id: "MXTAM"
  },
  MXTLA: {
    name: "Tlaxcala",
    parent_id: "MXTLA"
  },
  MXVER: {
    name: "Veracruz",
    parent_id: "MXVER",
    x: 727.9,
    y: 507.6
  },
    MXYUC: {
    name: "Yucatán",
    parent_id: "MXYUC"
  },
  MXZAC: {
    name: "Zacatecas",
    parent_id: "MXZAC"
  }
},
legend: {
  entries: []
},
regions: {}
};
