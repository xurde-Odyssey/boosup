create or replace function public.get_current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ou.organization_id
  from public.organization_users ou
  where ou.user_id = auth.uid()
    and ou.status = 'ACTIVE'
  order by
    case ou.role
      when 'OWNER' then 1
      when 'ADMIN' then 2
      when 'STAFF' then 3
      else 4
    end,
    ou.created_at asc
  limit 1
$$;

create or replace function public.user_belongs_to_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = p_organization_id
      and ou.user_id = auth.uid()
      and ou.status = 'ACTIVE'
  )
$$;
