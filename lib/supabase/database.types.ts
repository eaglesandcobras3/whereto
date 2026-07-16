export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      area_businesses: {
        Row: {
          area_id: string
          business_id: string
          id: string
          sort: number | null
        }
        Insert: {
          area_id: string
          business_id: string
          id: string
          sort?: number | null
        }
        Update: {
          area_id?: string
          business_id?: string
          id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "area_businesses_area_id_foreign"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_businesses_business_id_foreign"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          address: string | null
          archived_at: string | null
          area_type: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          excerpt: string | null
          featured: boolean | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          is_shopping_area: boolean | null
          main_image: string | null
          map_lat: number | null
          map_lng: number | null
          published_at: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          status: string
          title: string
          town_id: string | null
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          area_type?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          is_shopping_area?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          title?: string
          town_id?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          area_type?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          is_shopping_area?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          title?: string
          town_id?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_town_id_foreign"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          archived_at: string | null
          canonical_url: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          description: string | null
          excerpt: string | null
          featured: boolean | null
          hero_image: string | null
          icon: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          main_image: string | null
          og_description: string | null
          og_title: string | null
          parent_category_id: string | null
          published_at: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          status: string
          title: string
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          archived_at?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          description?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          icon?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          parent_category_id?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          archived_at?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          description?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          icon?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          parent_category_id?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_icon_foreign"
            columns: ["icon"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_parent_category_id_foreign"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_categories_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_secondary_categories: {
        Row: {
          business_category_id: string
          business_id: string
          id: string
          sort: number | null
        }
        Insert: {
          business_category_id: string
          business_id: string
          id: string
          sort?: number | null
        }
        Update: {
          business_category_id?: string
          business_id?: string
          id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_secondary_categories_business_category_id_foreign"
            columns: ["business_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_secondary_categories_business_id_foreign"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_listing_requests: {
        Row: {
          id: string
          status: string
          submitter_name: string
          submitter_email: string
          submitter_phone: string | null
          title: string
          town_id: string | null
          primary_category_id: string | null
          address: string | null
          website: string | null
          phone: string | null
          email: string | null
          description: string | null
          is_storefront: boolean
          is_service_business: boolean
          service_area: string | null
          map_lat: number | null
          map_lng: number | null
          possible_duplicate_business_ids: string[]
          admin_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          resulting_business_id: string | null
          source_ip: string | null
          user_agent: string | null
          date_created: string
          date_updated: string
        }
        Insert: {
          id?: string
          status?: string
          submitter_name: string
          submitter_email: string
          submitter_phone?: string | null
          title: string
          town_id?: string | null
          primary_category_id?: string | null
          address?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          description?: string | null
          is_storefront?: boolean
          is_service_business?: boolean
          service_area?: string | null
          map_lat?: number | null
          map_lng?: number | null
          possible_duplicate_business_ids?: string[]
          admin_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          resulting_business_id?: string | null
          source_ip?: string | null
          user_agent?: string | null
          date_created?: string
          date_updated?: string
        }
        Update: {
          id?: string
          status?: string
          submitter_name?: string
          submitter_email?: string
          submitter_phone?: string | null
          title?: string
          town_id?: string | null
          primary_category_id?: string | null
          address?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          description?: string | null
          is_storefront?: boolean
          is_service_business?: boolean
          service_area?: string | null
          map_lat?: number | null
          map_lng?: number | null
          possible_duplicate_business_ids?: string[]
          admin_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          resulting_business_id?: string | null
          source_ip?: string | null
          user_agent?: string | null
          date_created?: string
          date_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_listing_requests_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_listing_requests_resulting_business_id_fkey"
            columns: ["resulting_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_listing_requests_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          archived_at: string | null
          area_id: string | null
          booking_url: string | null
          business_type: string | null
          claim_status: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          email: string | null
          excerpt: string | null
          facebook_url: string | null
          featured: boolean | null
          hero_image: string | null
          hours: Json | null
          id: string
          instagram_url: string | null
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          is_service_business: boolean | null
          is_storefront: boolean | null
          is_verified: boolean | null
          main_image: string | null
          map_lat: number | null
          map_lng: number | null
          menu_url: string | null
          overview: string | null
          phone: string | null
          price_level: string | null
          primary_category_id: string | null
          published_at: string | null
          review_count_cached: number | null
          review_rating_cached: number | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          service_area: string | null
          slug: string
          sort: number | null
          status: string
          tiktok_url: string | null
          title: string
          town_id: string | null
          user_created: string | null
          user_updated: string | null
          website: string | null
          yelp_url: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          area_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          claim_status?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          email?: string | null
          excerpt?: string | null
          facebook_url?: string | null
          featured?: boolean | null
          hero_image?: string | null
          hours?: Json | null
          id: string
          instagram_url?: string | null
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          is_service_business?: boolean | null
          is_storefront?: boolean | null
          is_verified?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          menu_url?: string | null
          overview?: string | null
          phone?: string | null
          price_level?: string | null
          primary_category_id?: string | null
          published_at?: string | null
          review_count_cached?: number | null
          review_rating_cached?: number | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          service_area?: string | null
          slug?: string
          sort?: number | null
          status?: string
          tiktok_url?: string | null
          title?: string
          town_id?: string | null
          user_created?: string | null
          user_updated?: string | null
          website?: string | null
          yelp_url?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          area_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          claim_status?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          email?: string | null
          excerpt?: string | null
          facebook_url?: string | null
          featured?: boolean | null
          hero_image?: string | null
          hours?: Json | null
          id?: string
          instagram_url?: string | null
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          is_service_business?: boolean | null
          is_storefront?: boolean | null
          is_verified?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          menu_url?: string | null
          overview?: string | null
          phone?: string | null
          price_level?: string | null
          primary_category_id?: string | null
          published_at?: string | null
          review_count_cached?: number | null
          review_rating_cached?: number | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          service_area?: string | null
          slug?: string
          sort?: number | null
          status?: string
          tiktok_url?: string | null
          title?: string
          town_id?: string | null
          user_created?: string | null
          user_updated?: string | null
          website?: string | null
          yelp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_area_id_foreign"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_primary_category_id_foreign"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_town_id_foreign"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_images: {
        Row: {
          alt_text: string | null
          caption: string | null
          collection_name: string
          file_id: string
          id: number
          item_id: string
          sort: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          collection_name?: string
          file_id: string
          id?: number
          item_id?: string
          sort?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          collection_name?: string
          file_id?: string
          id?: number
          item_id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_images_file_id_foreign"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
        ]
      }
      content_links: {
        Row: {
          archived_at: string | null
          canonical_url: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          excerpt: string | null
          featured: boolean | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          main_image: string | null
          notes: string | null
          og_description: string | null
          og_title: string | null
          published_at: string | null
          relationship_type: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          source_collection: string
          source_id: string
          status: string
          target_collection: string
          target_id: string
          title: string
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          archived_at?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          notes?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          relationship_type?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          source_collection?: string
          source_id: string
          status?: string
          target_collection?: string
          target_id: string
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          archived_at?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          notes?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          relationship_type?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          source_collection?: string
          source_id?: string
          status?: string
          target_collection?: string
          target_id?: string
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_links_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_links_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_links_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_links_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      contributors: {
        Row: {
          avatar: string | null
          bio: string | null
          date_created: string | null
          date_updated: string | null
          id: string
          instagram_url: string | null
          role: string | null
          slug: string | null
          sort: number | null
          status: string
          tiktok_url: string | null
          title: string
          user_created: string | null
          user_id: string | null
          user_updated: string | null
          website: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          date_created?: string | null
          date_updated?: string | null
          id: string
          instagram_url?: string | null
          role?: string | null
          slug?: string | null
          sort?: number | null
          status?: string
          tiktok_url?: string | null
          title?: string
          user_created?: string | null
          user_id?: string | null
          user_updated?: string | null
          website?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          date_created?: string | null
          date_updated?: string | null
          id?: string
          instagram_url?: string | null
          role?: string | null
          slug?: string | null
          sort?: number | null
          status?: string
          tiktok_url?: string | null
          title?: string
          user_created?: string | null
          user_id?: string | null
          user_updated?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributors_avatar_foreign"
            columns: ["avatar"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributors_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributors_user_id_foreign"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributors_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_access: {
        Row: {
          id: string
          policy: string
          role: string | null
          sort: number | null
          user: string | null
        }
        Insert: {
          id: string
          policy: string
          role?: string | null
          sort?: number | null
          user?: string | null
        }
        Update: {
          id?: string
          policy?: string
          role?: string | null
          sort?: number | null
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_access_policy_foreign"
            columns: ["policy"]
            isOneToOne: false
            referencedRelation: "directus_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_access_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_access_user_foreign"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_activity: {
        Row: {
          action: string
          collection: string
          id: number
          ip: string | null
          item: string
          origin: string | null
          timestamp: string
          user: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          collection: string
          id?: number
          ip?: string | null
          item: string
          origin?: string | null
          timestamp?: string
          user?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          collection?: string
          id?: number
          ip?: string | null
          item?: string
          origin?: string | null
          timestamp?: string
          user?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      directus_collections: {
        Row: {
          accountability: string | null
          archive_app_filter: boolean
          archive_field: string | null
          archive_value: string | null
          collapse: string
          collection: string
          color: string | null
          display_template: string | null
          group: string | null
          hidden: boolean
          icon: string | null
          item_duplication_fields: Json | null
          note: string | null
          preview_url: string | null
          singleton: boolean
          sort: number | null
          sort_field: string | null
          translations: Json | null
          unarchive_value: string | null
          versioning: boolean
        }
        Insert: {
          accountability?: string | null
          archive_app_filter?: boolean
          archive_field?: string | null
          archive_value?: string | null
          collapse?: string
          collection: string
          color?: string | null
          display_template?: string | null
          group?: string | null
          hidden?: boolean
          icon?: string | null
          item_duplication_fields?: Json | null
          note?: string | null
          preview_url?: string | null
          singleton?: boolean
          sort?: number | null
          sort_field?: string | null
          translations?: Json | null
          unarchive_value?: string | null
          versioning?: boolean
        }
        Update: {
          accountability?: string | null
          archive_app_filter?: boolean
          archive_field?: string | null
          archive_value?: string | null
          collapse?: string
          collection?: string
          color?: string | null
          display_template?: string | null
          group?: string | null
          hidden?: boolean
          icon?: string | null
          item_duplication_fields?: Json | null
          note?: string | null
          preview_url?: string | null
          singleton?: boolean
          sort?: number | null
          sort_field?: string | null
          translations?: Json | null
          unarchive_value?: string | null
          versioning?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "directus_collections_group_foreign"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "directus_collections"
            referencedColumns: ["collection"]
          },
        ]
      }
      directus_comments: {
        Row: {
          collection: string
          comment: string
          date_created: string | null
          date_updated: string | null
          id: string
          item: string
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          collection: string
          comment: string
          date_created?: string | null
          date_updated?: string | null
          id: string
          item: string
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          collection?: string
          comment?: string
          date_created?: string | null
          date_updated?: string | null
          id?: string
          item?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_comments_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_comments_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_dashboards: {
        Row: {
          color: string | null
          date_created: string | null
          icon: string
          id: string
          name: string
          note: string | null
          user_created: string | null
        }
        Insert: {
          color?: string | null
          date_created?: string | null
          icon?: string
          id: string
          name: string
          note?: string | null
          user_created?: string | null
        }
        Update: {
          color?: string | null
          date_created?: string | null
          icon?: string
          id?: string
          name?: string
          note?: string | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_dashboards_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_deployment_projects: {
        Row: {
          date_created: string | null
          deployable: boolean
          deployment: string
          external_id: string
          framework: string | null
          id: string
          name: string
          url: string | null
          user_created: string | null
        }
        Insert: {
          date_created?: string | null
          deployable?: boolean
          deployment: string
          external_id: string
          framework?: string | null
          id: string
          name: string
          url?: string | null
          user_created?: string | null
        }
        Update: {
          date_created?: string | null
          deployable?: boolean
          deployment?: string
          external_id?: string
          framework?: string | null
          id?: string
          name?: string
          url?: string | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_deployment_projects_deployment_foreign"
            columns: ["deployment"]
            isOneToOne: false
            referencedRelation: "directus_deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_deployment_projects_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_deployment_runs: {
        Row: {
          completed_at: string | null
          date_created: string | null
          external_id: string
          id: string
          project: string
          started_at: string | null
          status: string | null
          target: string
          url: string | null
          user_created: string | null
        }
        Insert: {
          completed_at?: string | null
          date_created?: string | null
          external_id: string
          id: string
          project: string
          started_at?: string | null
          status?: string | null
          target: string
          url?: string | null
          user_created?: string | null
        }
        Update: {
          completed_at?: string | null
          date_created?: string | null
          external_id?: string
          id?: string
          project?: string
          started_at?: string | null
          status?: string | null
          target?: string
          url?: string | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_deployment_runs_project_foreign"
            columns: ["project"]
            isOneToOne: false
            referencedRelation: "directus_deployment_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_deployment_runs_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_deployments: {
        Row: {
          credentials: string | null
          date_created: string | null
          id: string
          last_synced_at: string | null
          options: string | null
          provider: string
          user_created: string | null
          webhook_ids: Json | null
          webhook_secret: string | null
        }
        Insert: {
          credentials?: string | null
          date_created?: string | null
          id: string
          last_synced_at?: string | null
          options?: string | null
          provider: string
          user_created?: string | null
          webhook_ids?: Json | null
          webhook_secret?: string | null
        }
        Update: {
          credentials?: string | null
          date_created?: string | null
          id?: string
          last_synced_at?: string | null
          options?: string | null
          provider?: string
          user_created?: string | null
          webhook_ids?: Json | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_deployments_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_extensions: {
        Row: {
          bundle: string | null
          enabled: boolean
          folder: string
          id: string
          source: string
        }
        Insert: {
          bundle?: string | null
          enabled?: boolean
          folder: string
          id: string
          source: string
        }
        Update: {
          bundle?: string | null
          enabled?: boolean
          folder?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      directus_fields: {
        Row: {
          collection: string
          conditions: Json | null
          display: string | null
          display_options: Json | null
          field: string
          group: string | null
          hidden: boolean
          id: number
          interface: string | null
          note: string | null
          options: Json | null
          readonly: boolean
          required: boolean | null
          searchable: boolean
          sort: number | null
          special: string | null
          translations: Json | null
          validation: Json | null
          validation_message: string | null
          width: string | null
        }
        Insert: {
          collection: string
          conditions?: Json | null
          display?: string | null
          display_options?: Json | null
          field: string
          group?: string | null
          hidden?: boolean
          id?: number
          interface?: string | null
          note?: string | null
          options?: Json | null
          readonly?: boolean
          required?: boolean | null
          searchable?: boolean
          sort?: number | null
          special?: string | null
          translations?: Json | null
          validation?: Json | null
          validation_message?: string | null
          width?: string | null
        }
        Update: {
          collection?: string
          conditions?: Json | null
          display?: string | null
          display_options?: Json | null
          field?: string
          group?: string | null
          hidden?: boolean
          id?: number
          interface?: string | null
          note?: string | null
          options?: Json | null
          readonly?: boolean
          required?: boolean | null
          searchable?: boolean
          sort?: number | null
          special?: string | null
          translations?: Json | null
          validation?: Json | null
          validation_message?: string | null
          width?: string | null
        }
        Relationships: []
      }
      directus_files: {
        Row: {
          charset: string | null
          created_on: string
          description: string | null
          duration: number | null
          embed: string | null
          filename_disk: string | null
          filename_download: string
          filesize: number | null
          focal_point_x: number | null
          focal_point_y: number | null
          folder: string | null
          height: number | null
          id: string
          location: string | null
          metadata: Json | null
          modified_by: string | null
          modified_on: string
          storage: string
          tags: string | null
          title: string | null
          tus_data: Json | null
          tus_id: string | null
          type: string | null
          uploaded_by: string | null
          uploaded_on: string | null
          width: number | null
        }
        Insert: {
          charset?: string | null
          created_on?: string
          description?: string | null
          duration?: number | null
          embed?: string | null
          filename_disk?: string | null
          filename_download: string
          filesize?: number | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          folder?: string | null
          height?: number | null
          id: string
          location?: string | null
          metadata?: Json | null
          modified_by?: string | null
          modified_on?: string
          storage: string
          tags?: string | null
          title?: string | null
          tus_data?: Json | null
          tus_id?: string | null
          type?: string | null
          uploaded_by?: string | null
          uploaded_on?: string | null
          width?: number | null
        }
        Update: {
          charset?: string | null
          created_on?: string
          description?: string | null
          duration?: number | null
          embed?: string | null
          filename_disk?: string | null
          filename_download?: string
          filesize?: number | null
          focal_point_x?: number | null
          focal_point_y?: number | null
          folder?: string | null
          height?: number | null
          id?: string
          location?: string | null
          metadata?: Json | null
          modified_by?: string | null
          modified_on?: string
          storage?: string
          tags?: string | null
          title?: string | null
          tus_data?: Json | null
          tus_id?: string | null
          type?: string | null
          uploaded_by?: string | null
          uploaded_on?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_files_folder_foreign"
            columns: ["folder"]
            isOneToOne: false
            referencedRelation: "directus_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_files_modified_by_foreign"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_files_uploaded_by_foreign"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_flows: {
        Row: {
          accountability: string | null
          color: string | null
          date_created: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          operation: string | null
          options: Json | null
          status: string
          trigger: string | null
          user_created: string | null
        }
        Insert: {
          accountability?: string | null
          color?: string | null
          date_created?: string | null
          description?: string | null
          icon?: string | null
          id: string
          name: string
          operation?: string | null
          options?: Json | null
          status?: string
          trigger?: string | null
          user_created?: string | null
        }
        Update: {
          accountability?: string | null
          color?: string | null
          date_created?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          operation?: string | null
          options?: Json | null
          status?: string
          trigger?: string | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_flows_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_folders: {
        Row: {
          id: string
          name: string
          parent: string | null
        }
        Insert: {
          id: string
          name: string
          parent?: string | null
        }
        Update: {
          id?: string
          name?: string
          parent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_folders_parent_foreign"
            columns: ["parent"]
            isOneToOne: false
            referencedRelation: "directus_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_migrations: {
        Row: {
          name: string
          timestamp: string | null
          version: string
        }
        Insert: {
          name: string
          timestamp?: string | null
          version: string
        }
        Update: {
          name?: string
          timestamp?: string | null
          version?: string
        }
        Relationships: []
      }
      directus_notifications: {
        Row: {
          collection: string | null
          id: number
          item: string | null
          message: string | null
          recipient: string
          sender: string | null
          status: string | null
          subject: string
          timestamp: string | null
        }
        Insert: {
          collection?: string | null
          id?: number
          item?: string | null
          message?: string | null
          recipient: string
          sender?: string | null
          status?: string | null
          subject: string
          timestamp?: string | null
        }
        Update: {
          collection?: string | null
          id?: number
          item?: string | null
          message?: string | null
          recipient?: string
          sender?: string | null
          status?: string | null
          subject?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_notifications_recipient_foreign"
            columns: ["recipient"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_notifications_sender_foreign"
            columns: ["sender"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_operations: {
        Row: {
          date_created: string | null
          flow: string
          id: string
          key: string
          name: string | null
          options: Json | null
          position_x: number
          position_y: number
          reject: string | null
          resolve: string | null
          type: string
          user_created: string | null
        }
        Insert: {
          date_created?: string | null
          flow: string
          id: string
          key: string
          name?: string | null
          options?: Json | null
          position_x: number
          position_y: number
          reject?: string | null
          resolve?: string | null
          type: string
          user_created?: string | null
        }
        Update: {
          date_created?: string | null
          flow?: string
          id?: string
          key?: string
          name?: string | null
          options?: Json | null
          position_x?: number
          position_y?: number
          reject?: string | null
          resolve?: string | null
          type?: string
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_operations_flow_foreign"
            columns: ["flow"]
            isOneToOne: false
            referencedRelation: "directus_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_operations_reject_foreign"
            columns: ["reject"]
            isOneToOne: true
            referencedRelation: "directus_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_operations_resolve_foreign"
            columns: ["resolve"]
            isOneToOne: true
            referencedRelation: "directus_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_operations_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_panels: {
        Row: {
          color: string | null
          dashboard: string
          date_created: string | null
          height: number
          icon: string | null
          id: string
          name: string | null
          note: string | null
          options: Json | null
          position_x: number
          position_y: number
          show_header: boolean
          type: string
          user_created: string | null
          width: number
        }
        Insert: {
          color?: string | null
          dashboard: string
          date_created?: string | null
          height: number
          icon?: string | null
          id: string
          name?: string | null
          note?: string | null
          options?: Json | null
          position_x: number
          position_y: number
          show_header?: boolean
          type: string
          user_created?: string | null
          width: number
        }
        Update: {
          color?: string | null
          dashboard?: string
          date_created?: string | null
          height?: number
          icon?: string | null
          id?: string
          name?: string | null
          note?: string | null
          options?: Json | null
          position_x?: number
          position_y?: number
          show_header?: boolean
          type?: string
          user_created?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "directus_panels_dashboard_foreign"
            columns: ["dashboard"]
            isOneToOne: false
            referencedRelation: "directus_dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_panels_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_permissions: {
        Row: {
          action: string
          collection: string
          fields: string | null
          id: number
          permissions: Json | null
          policy: string
          presets: Json | null
          validation: Json | null
        }
        Insert: {
          action: string
          collection: string
          fields?: string | null
          id?: number
          permissions?: Json | null
          policy: string
          presets?: Json | null
          validation?: Json | null
        }
        Update: {
          action?: string
          collection?: string
          fields?: string | null
          id?: number
          permissions?: Json | null
          policy?: string
          presets?: Json | null
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_permissions_policy_foreign"
            columns: ["policy"]
            isOneToOne: false
            referencedRelation: "directus_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_policies: {
        Row: {
          admin_access: boolean
          app_access: boolean
          description: string | null
          enforce_tfa: boolean
          icon: string
          id: string
          ip_access: string | null
          name: string
        }
        Insert: {
          admin_access?: boolean
          app_access?: boolean
          description?: string | null
          enforce_tfa?: boolean
          icon?: string
          id: string
          ip_access?: string | null
          name: string
        }
        Update: {
          admin_access?: boolean
          app_access?: boolean
          description?: string | null
          enforce_tfa?: boolean
          icon?: string
          id?: string
          ip_access?: string | null
          name?: string
        }
        Relationships: []
      }
      directus_presets: {
        Row: {
          bookmark: string | null
          collection: string | null
          color: string | null
          filter: Json | null
          icon: string | null
          id: number
          layout: string | null
          layout_options: Json | null
          layout_query: Json | null
          refresh_interval: number | null
          role: string | null
          search: string | null
          user: string | null
        }
        Insert: {
          bookmark?: string | null
          collection?: string | null
          color?: string | null
          filter?: Json | null
          icon?: string | null
          id?: number
          layout?: string | null
          layout_options?: Json | null
          layout_query?: Json | null
          refresh_interval?: number | null
          role?: string | null
          search?: string | null
          user?: string | null
        }
        Update: {
          bookmark?: string | null
          collection?: string | null
          color?: string | null
          filter?: Json | null
          icon?: string | null
          id?: number
          layout?: string | null
          layout_options?: Json | null
          layout_query?: Json | null
          refresh_interval?: number | null
          role?: string | null
          search?: string | null
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_presets_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_presets_user_foreign"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_relations: {
        Row: {
          id: number
          junction_field: string | null
          many_collection: string
          many_field: string
          one_allowed_collections: string | null
          one_collection: string | null
          one_collection_field: string | null
          one_deselect_action: string
          one_field: string | null
          sort_field: string | null
        }
        Insert: {
          id?: number
          junction_field?: string | null
          many_collection: string
          many_field: string
          one_allowed_collections?: string | null
          one_collection?: string | null
          one_collection_field?: string | null
          one_deselect_action?: string
          one_field?: string | null
          sort_field?: string | null
        }
        Update: {
          id?: number
          junction_field?: string | null
          many_collection?: string
          many_field?: string
          one_allowed_collections?: string | null
          one_collection?: string | null
          one_collection_field?: string | null
          one_deselect_action?: string
          one_field?: string | null
          sort_field?: string | null
        }
        Relationships: []
      }
      directus_revisions: {
        Row: {
          activity: number
          collection: string
          data: Json | null
          delta: Json | null
          id: number
          item: string
          parent: number | null
          version: string | null
        }
        Insert: {
          activity: number
          collection: string
          data?: Json | null
          delta?: Json | null
          id?: number
          item: string
          parent?: number | null
          version?: string | null
        }
        Update: {
          activity?: number
          collection?: string
          data?: Json | null
          delta?: Json | null
          id?: number
          item?: string
          parent?: number | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_revisions_activity_foreign"
            columns: ["activity"]
            isOneToOne: false
            referencedRelation: "directus_activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_revisions_parent_foreign"
            columns: ["parent"]
            isOneToOne: false
            referencedRelation: "directus_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_revisions_version_foreign"
            columns: ["version"]
            isOneToOne: false
            referencedRelation: "directus_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_roles: {
        Row: {
          description: string | null
          icon: string
          id: string
          name: string
          parent: string | null
        }
        Insert: {
          description?: string | null
          icon?: string
          id: string
          name: string
          parent?: string | null
        }
        Update: {
          description?: string | null
          icon?: string
          id?: string
          name?: string
          parent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_roles_parent_foreign"
            columns: ["parent"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_sessions: {
        Row: {
          expires: string
          ip: string | null
          next_token: string | null
          origin: string | null
          share: string | null
          token: string
          user: string | null
          user_agent: string | null
        }
        Insert: {
          expires: string
          ip?: string | null
          next_token?: string | null
          origin?: string | null
          share?: string | null
          token: string
          user?: string | null
          user_agent?: string | null
        }
        Update: {
          expires?: string
          ip?: string | null
          next_token?: string | null
          origin?: string | null
          share?: string | null
          token?: string
          user?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_sessions_share_foreign"
            columns: ["share"]
            isOneToOne: false
            referencedRelation: "directus_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_sessions_user_foreign"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_settings: {
        Row: {
          ai_anthropic_allowed_models: Json | null
          ai_anthropic_api_key: string | null
          ai_google_allowed_models: Json | null
          ai_google_api_key: string | null
          ai_openai_allowed_models: Json | null
          ai_openai_api_key: string | null
          ai_openai_compatible_api_key: string | null
          ai_openai_compatible_base_url: string | null
          ai_openai_compatible_headers: Json | null
          ai_openai_compatible_models: Json | null
          ai_openai_compatible_name: string | null
          ai_system_prompt: string | null
          auth_login_attempts: number | null
          auth_password_policy: string | null
          basemaps: Json | null
          collaborative_editing_enabled: boolean
          custom_aspect_ratios: Json | null
          custom_css: string | null
          default_appearance: string
          default_language: string
          default_theme_dark: string | null
          default_theme_light: string | null
          id: number
          mapbox_key: string | null
          mcp_allow_deletes: boolean
          mcp_enabled: boolean
          mcp_prompts_collection: string | null
          mcp_system_prompt: string | null
          mcp_system_prompt_enabled: boolean
          module_bar: Json | null
          org_name: string | null
          product_updates: boolean | null
          project_color: string
          project_descriptor: string | null
          project_id: string | null
          project_logo: string | null
          project_name: string
          project_owner: string | null
          project_status: string | null
          project_url: string | null
          project_usage: string | null
          public_background: string | null
          public_favicon: string | null
          public_foreground: string | null
          public_note: string | null
          public_registration: boolean
          public_registration_email_filter: Json | null
          public_registration_role: string | null
          public_registration_verify_email: boolean
          report_bug_url: string | null
          report_error_url: string | null
          report_feature_url: string | null
          storage_asset_presets: Json | null
          storage_asset_transform: string | null
          storage_default_folder: string | null
          theme_dark_overrides: Json | null
          theme_light_overrides: Json | null
          visual_editor_urls: Json | null
        }
        Insert: {
          ai_anthropic_allowed_models?: Json | null
          ai_anthropic_api_key?: string | null
          ai_google_allowed_models?: Json | null
          ai_google_api_key?: string | null
          ai_openai_allowed_models?: Json | null
          ai_openai_api_key?: string | null
          ai_openai_compatible_api_key?: string | null
          ai_openai_compatible_base_url?: string | null
          ai_openai_compatible_headers?: Json | null
          ai_openai_compatible_models?: Json | null
          ai_openai_compatible_name?: string | null
          ai_system_prompt?: string | null
          auth_login_attempts?: number | null
          auth_password_policy?: string | null
          basemaps?: Json | null
          collaborative_editing_enabled?: boolean
          custom_aspect_ratios?: Json | null
          custom_css?: string | null
          default_appearance?: string
          default_language?: string
          default_theme_dark?: string | null
          default_theme_light?: string | null
          id?: number
          mapbox_key?: string | null
          mcp_allow_deletes?: boolean
          mcp_enabled?: boolean
          mcp_prompts_collection?: string | null
          mcp_system_prompt?: string | null
          mcp_system_prompt_enabled?: boolean
          module_bar?: Json | null
          org_name?: string | null
          product_updates?: boolean | null
          project_color?: string
          project_descriptor?: string | null
          project_id?: string | null
          project_logo?: string | null
          project_name?: string
          project_owner?: string | null
          project_status?: string | null
          project_url?: string | null
          project_usage?: string | null
          public_background?: string | null
          public_favicon?: string | null
          public_foreground?: string | null
          public_note?: string | null
          public_registration?: boolean
          public_registration_email_filter?: Json | null
          public_registration_role?: string | null
          public_registration_verify_email?: boolean
          report_bug_url?: string | null
          report_error_url?: string | null
          report_feature_url?: string | null
          storage_asset_presets?: Json | null
          storage_asset_transform?: string | null
          storage_default_folder?: string | null
          theme_dark_overrides?: Json | null
          theme_light_overrides?: Json | null
          visual_editor_urls?: Json | null
        }
        Update: {
          ai_anthropic_allowed_models?: Json | null
          ai_anthropic_api_key?: string | null
          ai_google_allowed_models?: Json | null
          ai_google_api_key?: string | null
          ai_openai_allowed_models?: Json | null
          ai_openai_api_key?: string | null
          ai_openai_compatible_api_key?: string | null
          ai_openai_compatible_base_url?: string | null
          ai_openai_compatible_headers?: Json | null
          ai_openai_compatible_models?: Json | null
          ai_openai_compatible_name?: string | null
          ai_system_prompt?: string | null
          auth_login_attempts?: number | null
          auth_password_policy?: string | null
          basemaps?: Json | null
          collaborative_editing_enabled?: boolean
          custom_aspect_ratios?: Json | null
          custom_css?: string | null
          default_appearance?: string
          default_language?: string
          default_theme_dark?: string | null
          default_theme_light?: string | null
          id?: number
          mapbox_key?: string | null
          mcp_allow_deletes?: boolean
          mcp_enabled?: boolean
          mcp_prompts_collection?: string | null
          mcp_system_prompt?: string | null
          mcp_system_prompt_enabled?: boolean
          module_bar?: Json | null
          org_name?: string | null
          product_updates?: boolean | null
          project_color?: string
          project_descriptor?: string | null
          project_id?: string | null
          project_logo?: string | null
          project_name?: string
          project_owner?: string | null
          project_status?: string | null
          project_url?: string | null
          project_usage?: string | null
          public_background?: string | null
          public_favicon?: string | null
          public_foreground?: string | null
          public_note?: string | null
          public_registration?: boolean
          public_registration_email_filter?: Json | null
          public_registration_role?: string | null
          public_registration_verify_email?: boolean
          report_bug_url?: string | null
          report_error_url?: string | null
          report_feature_url?: string | null
          storage_asset_presets?: Json | null
          storage_asset_transform?: string | null
          storage_default_folder?: string | null
          theme_dark_overrides?: Json | null
          theme_light_overrides?: Json | null
          visual_editor_urls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_settings_project_logo_foreign"
            columns: ["project_logo"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_public_background_foreign"
            columns: ["public_background"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_public_favicon_foreign"
            columns: ["public_favicon"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_public_foreground_foreign"
            columns: ["public_foreground"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_public_registration_role_foreign"
            columns: ["public_registration_role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_storage_default_folder_foreign"
            columns: ["storage_default_folder"]
            isOneToOne: false
            referencedRelation: "directus_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_shares: {
        Row: {
          collection: string
          date_created: string | null
          date_end: string | null
          date_start: string | null
          id: string
          item: string
          max_uses: number | null
          name: string | null
          password: string | null
          role: string | null
          times_used: number | null
          user_created: string | null
        }
        Insert: {
          collection: string
          date_created?: string | null
          date_end?: string | null
          date_start?: string | null
          id: string
          item: string
          max_uses?: number | null
          name?: string | null
          password?: string | null
          role?: string | null
          times_used?: number | null
          user_created?: string | null
        }
        Update: {
          collection?: string
          date_created?: string | null
          date_end?: string | null
          date_start?: string | null
          id?: string
          item?: string
          max_uses?: number | null
          name?: string | null
          password?: string | null
          role?: string | null
          times_used?: number | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_shares_collection_foreign"
            columns: ["collection"]
            isOneToOne: false
            referencedRelation: "directus_collections"
            referencedColumns: ["collection"]
          },
          {
            foreignKeyName: "directus_shares_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_shares_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_translations: {
        Row: {
          id: string
          key: string
          language: string
          value: string
        }
        Insert: {
          id: string
          key: string
          language: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          language?: string
          value?: string
        }
        Relationships: []
      }
      directus_users: {
        Row: {
          appearance: string | null
          auth_data: Json | null
          avatar: string | null
          description: string | null
          email: string | null
          email_notifications: boolean | null
          external_identifier: string | null
          first_name: string | null
          id: string
          language: string | null
          last_access: string | null
          last_name: string | null
          last_page: string | null
          location: string | null
          password: string | null
          provider: string
          role: string | null
          status: string
          tags: Json | null
          text_direction: string
          tfa_secret: string | null
          theme_dark: string | null
          theme_dark_overrides: Json | null
          theme_light: string | null
          theme_light_overrides: Json | null
          title: string | null
          token: string | null
        }
        Insert: {
          appearance?: string | null
          auth_data?: Json | null
          avatar?: string | null
          description?: string | null
          email?: string | null
          email_notifications?: boolean | null
          external_identifier?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_access?: string | null
          last_name?: string | null
          last_page?: string | null
          location?: string | null
          password?: string | null
          provider?: string
          role?: string | null
          status?: string
          tags?: Json | null
          text_direction?: string
          tfa_secret?: string | null
          theme_dark?: string | null
          theme_dark_overrides?: Json | null
          theme_light?: string | null
          theme_light_overrides?: Json | null
          title?: string | null
          token?: string | null
        }
        Update: {
          appearance?: string | null
          auth_data?: Json | null
          avatar?: string | null
          description?: string | null
          email?: string | null
          email_notifications?: boolean | null
          external_identifier?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_access?: string | null
          last_name?: string | null
          last_page?: string | null
          location?: string | null
          password?: string | null
          provider?: string
          role?: string | null
          status?: string
          tags?: Json | null
          text_direction?: string
          tfa_secret?: string | null
          theme_dark?: string | null
          theme_dark_overrides?: Json | null
          theme_light?: string | null
          theme_light_overrides?: Json | null
          title?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_users_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      directus_versions: {
        Row: {
          collection: string
          date_created: string | null
          date_updated: string | null
          delta: Json | null
          hash: string | null
          id: string
          item: string
          key: string
          name: string | null
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          collection: string
          date_created?: string | null
          date_updated?: string | null
          delta?: Json | null
          hash?: string | null
          id: string
          item: string
          key: string
          name?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          collection?: string
          date_created?: string | null
          date_updated?: string | null
          delta?: Json | null
          hash?: string | null
          id?: string
          item?: string
          key?: string
          name?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_versions_collection_foreign"
            columns: ["collection"]
            isOneToOne: false
            referencedRelation: "directus_collections"
            referencedColumns: ["collection"]
          },
          {
            foreignKeyName: "directus_versions_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_versions_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_areas: {
        Row: {
          area_id: string
          event_id: string
          id: string
          sort: number | null
        }
        Insert: {
          area_id: string
          event_id: string
          id: string
          sort?: number | null
        }
        Update: {
          area_id?: string
          event_id?: string
          id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_areas_area_id_foreign"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_areas_event_id_foreign"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_businesses: {
        Row: {
          businesse_id: string
          event_id: string
          id: string
          sort: number | null
        }
        Insert: {
          businesse_id: string
          event_id: string
          id: string
          sort?: number | null
        }
        Update: {
          businesse_id?: string
          event_id?: string
          id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_businesses_businesse_id_foreign"
            columns: ["businesse_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_businesses_event_id_foreign"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_points_of_interest: {
        Row: {
          event_id: string
          id: string
          point_of_interest_id: string
          sort: number | null
        }
        Insert: {
          event_id: string
          id: string
          point_of_interest_id: string
          sort?: number | null
        }
        Update: {
          event_id?: string
          id?: string
          point_of_interest_id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_points_of_interest_event_id_foreign"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_points_of_interest_point_of_interest_id_foreign"
            columns: ["point_of_interest_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
        ]
      }
      event_towns: {
        Row: {
          event_id: string
          id: string
          sort: number | null
          town_id: string
        }
        Insert: {
          event_id: string
          id: string
          sort?: number | null
          town_id: string
        }
        Update: {
          event_id?: string
          id?: string
          sort?: number | null
          town_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_towns_event_id_foreign"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_towns_town_id_foreign"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          all_day: boolean | null
          archived_at: string | null
          canonical_url: string | null
          content: string | null
          cost_notes: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          ends_at: string | null
          event_type: string | null
          excerpt: string | null
          featured: boolean | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          location_name: string | null
          main_image: string | null
          og_description: string | null
          og_title: string | null
          published_at: string | null
          recurrence_rule: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          starts_at: string | null
          status: string
          summary: string | null
          ticket_url: string | null
          timezone: string | null
          title: string
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          address?: string | null
          all_day?: boolean | null
          archived_at?: string | null
          canonical_url?: string | null
          content?: string | null
          cost_notes?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          ends_at?: string | null
          event_type?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          location_name?: string | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          recurrence_rule?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          starts_at?: string | null
          status?: string
          summary?: string | null
          ticket_url?: string | null
          timezone?: string | null
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          address?: string | null
          all_day?: boolean | null
          archived_at?: string | null
          canonical_url?: string | null
          content?: string | null
          cost_notes?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          ends_at?: string | null
          event_type?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          location_name?: string | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          recurrence_rule?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          starts_at?: string | null
          status?: string
          summary?: string | null
          ticket_url?: string | null
          timezone?: string | null
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_tags_vocabulary: {
        Row: {
          date_created: string
          label: string | null
          tag: string
        }
        Insert: {
          date_created?: string
          label?: string | null
          tag: string
        }
        Update: {
          date_created?: string
          label?: string | null
          tag?: string
        }
        Relationships: []
      }
      guide_areas: {
        Row: {
          area_id: string
          guide_id: string
          id: string
          sort: number | null
        }
        Insert: {
          area_id: string
          guide_id: string
          id: string
          sort?: number | null
        }
        Update: {
          area_id?: string
          guide_id?: string
          id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_areas_area_id_foreign"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_areas_guide_id_foreign"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_businesses: {
        Row: {
          business_id: string
          guide_id: string
          id: string
          sort: number | null
        }
        Insert: {
          business_id: string
          guide_id: string
          id: string
          sort?: number | null
        }
        Update: {
          business_id?: string
          guide_id?: string
          id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_businesses_business_id_foreign"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_businesses_guide_id_foreign"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_events: {
        Row: {
          event_id: string
          guide_id: string
          id: number
          sort: number | null
        }
        Insert: {
          event_id: string
          guide_id: string
          id?: number
          sort?: number | null
        }
        Update: {
          event_id?: string
          guide_id?: string
          id?: number
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_events_event_id_foreign"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_events_guide_id_foreign"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_points_of_interest: {
        Row: {
          guide_id: string
          id: string
          point_of_interest_id: string
          sort: number | null
        }
        Insert: {
          guide_id: string
          id: string
          point_of_interest_id: string
          sort?: number | null
        }
        Update: {
          guide_id?: string
          id?: string
          point_of_interest_id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_points_of_interest_guide_id_foreign"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_points_of_interest_point_of_interest_id_foreign"
            columns: ["point_of_interest_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_towns: {
        Row: {
          guide_id: string
          id: string
          sort: number | null
          town_id: string
        }
        Insert: {
          guide_id: string
          id: string
          sort?: number | null
          town_id: string
        }
        Update: {
          guide_id?: string
          id?: string
          sort?: number | null
          town_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_towns_guide_id_foreign"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guide_towns_town_id_foreign"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          archived_at: string | null
          author_id: string | null
          canonical_url: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          excerpt: string | null
          featured: boolean | null
          guide_type: string | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          main_image: string | null
          og_description: string | null
          og_title: string | null
          published_at: string | null
          reading_time_minutes: number | null
          search_keywords: string | null
          search_tags: string[] | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          status: string
          summary: string | null
          title: string
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          archived_at?: string | null
          author_id?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          guide_type?: string | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          search_keywords?: string | null
          search_tags?: string[] | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          summary?: string | null
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          archived_at?: string | null
          author_id?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          guide_type?: string | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          search_keywords?: string | null
          search_tags?: string[] | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          summary?: string | null
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guides_author_id_foreign"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_url: string | null
          archived_at: string | null
          business_id: string
          canonical_url: string | null
          compensation_notes: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          employment_type: string | null
          excerpt: string | null
          expires_at: string | null
          featured: boolean | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          job_location_type: string | null
          main_image: string | null
          og_description: string | null
          og_title: string | null
          published_at: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          status: string
          summary: string | null
          title: string
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          apply_url?: string | null
          archived_at?: string | null
          business_id: string
          canonical_url?: string | null
          compensation_notes?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          employment_type?: string | null
          excerpt?: string | null
          expires_at?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          job_location_type?: string | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          summary?: string | null
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          apply_url?: string | null
          archived_at?: string | null
          business_id?: string
          canonical_url?: string | null
          compensation_notes?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          employment_type?: string | null
          excerpt?: string | null
          expires_at?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          job_location_type?: string | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          summary?: string | null
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_foreign"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      points_of_interest: {
        Row: {
          access_notes: string | null
          address: string | null
          amenities: Json | null
          archived_at: string | null
          area_id: string | null
          canonical_url: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          excerpt: string | null
          featured: boolean | null
          fees: string | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          main_image: string | null
          map_lat: number | null
          map_lng: number | null
          og_description: string | null
          og_title: string | null
          poi_type: string | null
          published_at: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          status: string
          summary: string | null
          title: string
          town_id: string | null
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          access_notes?: string | null
          address?: string | null
          amenities?: Json | null
          archived_at?: string | null
          area_id?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          fees?: string | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          og_description?: string | null
          og_title?: string | null
          poi_type?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          summary?: string | null
          title?: string
          town_id?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          access_notes?: string | null
          address?: string | null
          amenities?: Json | null
          archived_at?: string | null
          area_id?: string | null
          canonical_url?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          fees?: string | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          og_description?: string | null
          og_title?: string | null
          poi_type?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          summary?: string | null
          title?: string
          town_id?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_of_interest_area_id_foreign"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_town_id_foreign"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          approved: boolean | null
          archived_at: string | null
          author_email: string | null
          author_name: string | null
          body: string | null
          canonical_url: string | null
          content: string | null
          created_at: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          excerpt: string | null
          featured: boolean | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          main_image: string | null
          og_description: string | null
          og_title: string | null
          published_at: string | null
          rating: number | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          source: string | null
          status: string
          target_collection: string
          target_id: string
          title: string
          user_created: string | null
          user_updated: string | null
          visit_date: string | null
        }
        Insert: {
          approved?: boolean | null
          archived_at?: string | null
          author_email?: string | null
          author_name?: string | null
          body?: string | null
          canonical_url?: string | null
          content?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          rating?: number | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          source?: string | null
          status?: string
          target_collection?: string
          target_id: string
          title?: string
          user_created?: string | null
          user_updated?: string | null
          visit_date?: string | null
        }
        Update: {
          approved?: boolean | null
          archived_at?: string | null
          author_email?: string | null
          author_name?: string | null
          body?: string | null
          canonical_url?: string | null
          content?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          rating?: number | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          source?: string | null
          status?: string
          target_collection?: string
          target_id?: string
          title?: string
          user_created?: string | null
          user_updated?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews_related_item: {
        Row: {
          collection: string
          id: number
          item: string
          reviews_id: string
        }
        Insert: {
          collection?: string
          id?: number
          item?: string
          reviews_id: string
        }
        Update: {
          collection?: string
          id?: number
          item?: string
          reviews_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_related_item_reviews_id_foreign"
            columns: ["reviews_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      search_documents: {
        Row: {
          archived_at: string | null
          area_slug: string | null
          business_category_slugs: Json | null
          canonical_url: string | null
          content: string | null
          content_plaintext: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          embedding: Json | null
          embeddings_status: string | null
          excerpt: string | null
          featured: boolean | null
          hero_image: string | null
          id: string
          image_id: string | null
          intent_tags: Json | null
          is_hidden_from_search: boolean | null
          last_indexed_at: string | null
          main_image: string | null
          og_description: string | null
          og_title: string | null
          published_at: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          source_collection: string
          source_id: string
          status: string
          title: string
          town_slug: string | null
          url: string | null
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          archived_at?: string | null
          area_slug?: string | null
          business_category_slugs?: Json | null
          canonical_url?: string | null
          content?: string | null
          content_plaintext?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          embedding?: Json | null
          embeddings_status?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id: string
          image_id?: string | null
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          last_indexed_at?: string | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          source_collection?: string
          source_id: string
          status?: string
          title?: string
          town_slug?: string | null
          url?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          archived_at?: string | null
          area_slug?: string | null
          business_category_slugs?: Json | null
          canonical_url?: string | null
          content?: string | null
          content_plaintext?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          embedding?: Json | null
          embeddings_status?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id?: string
          image_id?: string | null
          intent_tags?: Json | null
          is_hidden_from_search?: boolean | null
          last_indexed_at?: string | null
          main_image?: string | null
          og_description?: string | null
          og_title?: string | null
          published_at?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          source_collection?: string
          source_id?: string
          status?: string
          title?: string
          town_slug?: string | null
          url?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_documents_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_documents_image_id_foreign"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_documents_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_documents_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_documents_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
      town_businesses: {
        Row: {
          business_id: string
          id: string
          sort: number | null
          town_id: string
        }
        Insert: {
          business_id: string
          id: string
          sort?: number | null
          town_id: string
        }
        Update: {
          business_id?: string
          id?: string
          sort?: number | null
          town_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "town_businesses_business_id_foreign"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "town_businesses_town_id_foreign"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      towns: {
        Row: {
          archived_at: string | null
          content: string | null
          custom_fields: Json | null
          date_created: string | null
          date_updated: string | null
          excerpt: string | null
          featured: boolean | null
          hero_image: string | null
          id: string
          intent_tags: Json | null
          is_featured_destination: boolean | null
          is_hidden_from_search: boolean | null
          main_image: string | null
          map_lat: number | null
          map_lng: number | null
          published_at: string | null
          region: string | null
          search_keywords: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number | null
          status: string
          title: string
          town_type: string | null
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          archived_at?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id: string
          intent_tags?: Json | null
          is_featured_destination?: boolean | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          published_at?: string | null
          region?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          title?: string
          town_type?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          archived_at?: string | null
          content?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_updated?: string | null
          excerpt?: string | null
          featured?: boolean | null
          hero_image?: string | null
          id?: string
          intent_tags?: Json | null
          is_featured_destination?: boolean | null
          is_hidden_from_search?: boolean | null
          main_image?: string | null
          map_lat?: number | null
          map_lng?: number | null
          published_at?: string | null
          region?: string | null
          search_keywords?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number | null
          status?: string
          title?: string
          town_type?: string | null
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "towns_hero_image_foreign"
            columns: ["hero_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "towns_main_image_foreign"
            columns: ["main_image"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "towns_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "towns_user_updated_foreign"
            columns: ["user_updated"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
