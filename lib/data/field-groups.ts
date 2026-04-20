import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function listFieldGroups() {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("field_groups")
    .select(
      "id, group_key, group_label, description, applies_to, is_active, sort_order, field_definitions(id, field_key, field_label, field_type, field_config, is_required, sort_order)",
    )
    .order("sort_order");
  return data ?? [];
}

