import { useState } from 'react'
import {
  Handshake,
  Plus,
  Globe,
  Trash2,
  Tag,
  Building2,
  Receipt,
  Gift,
  Trophy,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Modal } from '@/components/modal'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { TabBar } from '@/components/tab-bar'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Organisations                                                      */
/* ------------------------------------------------------------------ */

function useOrganisations() {
  return useQuery({
    queryKey: ['admin-organisations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Partner Offers                                                     */
/* ------------------------------------------------------------------ */

function usePartnerOffers() {
  return useQuery({
    queryKey: ['admin-partner-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_offers')
        .select('*, organisations(name, logo_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })
}

const orgTypeOptions = [
  { value: 'corporate', label: 'Corporate' },
  { value: 'ngo', label: 'NGO' },
  { value: 'government', label: 'Government' },
  { value: 'community', label: 'Community' },
]

const tabs = [
  { id: 'organisations', label: 'Organisations', icon: <Building2 size={14} /> },
  { id: 'offers', label: 'Partner Offers', icon: <Gift size={14} /> },
  { id: 'corporate', label: 'Corporate Programs', icon: <Handshake size={14} /> },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminPartnersPage() {
  const [activeTab, setActiveTab] = useState('organisations')
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCreateOffer, setShowCreateOffer] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string } | null>(null)
  const [orgForm, setOrgForm] = useState({
    name: '',
    type: 'corporate',
    website: '',
    contact_name: '',
    contact_email: '',
    description: '',
  })
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    organisation_id: '',
    category: '',
    terms: '',
  })

  const queryClient = useQueryClient()
  const { data: organisations, isLoading: orgsLoading } = useOrganisations()
  const { data: offers, isLoading: offersLoading } = usePartnerOffers()

  useAdminHeader('Partners & Sponsors')

  const createOrgMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('organisations').insert(orgForm as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organisations'] })
      setShowCreateOrg(false)
      setOrgForm({
        name: '',
        type: 'corporate',
        website: '',
        contact_name: '',
        contact_email: '',
        description: '',
      })
    },
  })

  const createOfferMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('partner_offers').insert({
        title: offerForm.title,
        description: offerForm.description,
        organisation_id: offerForm.organisation_id || null,
        category: offerForm.category,
        terms_and_conditions: offerForm.terms,
      } as any)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-offers'] })
      setShowCreateOffer(false)
      setOfferForm({ title: '', description: '', organisation_id: '', category: '', terms: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const table = type === 'org' ? 'organisations' : 'partner_offers'
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organisations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-partner-offers'] })
      setDeleteTarget(null)
    },
  })

  return (
    <>
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-4"
      />

      {/* Organisations tab */}
      {activeTab === 'organisations' && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setShowCreateOrg(true)}
            >
              Add Organisation
            </Button>
          </div>

          {orgsLoading ? (
            <Skeleton variant="list-item" count={4} />
          ) : !organisations?.length ? (
            <EmptyState
              illustration="empty"
              title="No organisations"
              description="Add partner organisations that Co-Exist collaborates with"
              action={{ label: 'Add Organisation', onClick: () => setShowCreateOrg(true) }}
            />
          ) : (
            <StaggeredList className="space-y-2">
              {organisations.map((org) => (
                <StaggeredItem
                  key={org.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white border border-primary-100 shadow-sm"
                >
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-contain bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white border border-primary-400 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-primary-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary-800 truncate">
                        {org.name}
                      </p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white text-primary-400 shrink-0">
                        {org.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-primary-400">
                      {org.contact_name && <span>{org.contact_name}</span>}
                      {org.website && (
                        <a
                          href={org.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 hover:text-primary-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe size={10} /> Website
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: org.id, type: 'org' })}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-600 cursor-pointer"
                    aria-label={`Delete ${org.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </>
      )}

      {/* Partner Offers tab */}
      {activeTab === 'offers' && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() => setShowCreateOffer(true)}
            >
              Add Offer
            </Button>
          </div>

          {offersLoading ? (
            <Skeleton variant="list-item" count={4} />
          ) : !offers?.length ? (
            <EmptyState
              illustration="empty"
              title="No partner offers"
              description="Create offers and discounts from partner organisations"
              action={{ label: 'Add Offer', onClick: () => setShowCreateOffer(true) }}
            />
          ) : (
            <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offers.map((offer: any) => (
                <StaggeredItem
                  key={offer.id}
                  className="p-4 rounded-xl bg-white border border-primary-100 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-primary-800">
                        {offer.title}
                      </h3>
                      {(offer as any).organisations?.name && (
                        <p className="text-xs text-primary-400 mt-0.5">
                          by {(offer as any).organisations.name}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: offer.id, type: 'offer' })}
                      className="p-1 rounded text-primary-400 hover:text-error-600 cursor-pointer"
                      aria-label="Delete offer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {offer.description && (
                    <p className="text-xs text-primary-400 mt-2 line-clamp-2">
                      {offer.description}
                    </p>
                  )}
                  {offer.category && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white border border-primary-400 text-primary-800">
                      <Tag size={10} />
                      {offer.category}
                    </span>
                  )}
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </>
      )}

      {/* Corporate Programs tab */}
      {activeTab === 'corporate' && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-gradient-to-br from-white to-secondary-100 border border-secondary-200">
            <h3 className="font-heading text-base font-semibold text-primary-800 mb-2">
              Corporate Volunteer Programs
            </h3>
            <p className="text-sm text-primary-800 mb-4">
              Track corporate partner volunteering, generate CSR reports, and manage
              sponsored challenges.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/70">
                <Handshake size={18} className="text-primary-400 mb-1" />
                <p className="text-sm font-medium text-primary-800">Corporate Events</p>
                <p className="text-xs text-primary-400">
                  Tag events with corporate partners for separate tracking
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/70">
                <Receipt size={18} className="text-primary-400 mb-1" />
                <p className="text-sm font-medium text-primary-800">Invoice Generation</p>
                <p className="text-xs text-primary-400">
                  Generate branded invoices for corporate sponsors
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/70">
                <Trophy size={18} className="text-primary-400 mb-1" />
                <p className="text-sm font-medium text-primary-800">Sponsored Challenges</p>
                <p className="text-xs text-primary-400">
                  Link challenges to sponsor organisations
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create org modal */}
      <Modal
        open={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        title="Add Organisation"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Organisation Name"
            value={orgForm.name}
            onChange={(e) => setOrgForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Dropdown
            options={orgTypeOptions}
            value={orgForm.type}
            onChange={(v) => setOrgForm((p) => ({ ...p, type: v }))}
            label="Type"
          />
          <Input
            label="Website"
            value={orgForm.website}
            onChange={(e) => setOrgForm((p) => ({ ...p, website: e.target.value }))}
            placeholder="https://..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Name"
              value={orgForm.contact_name}
              onChange={(e) =>
                setOrgForm((p) => ({ ...p, contact_name: e.target.value }))
              }
            />
            <Input
              label="Contact Email"
              type="email"
              value={orgForm.contact_email}
              onChange={(e) =>
                setOrgForm((p) => ({ ...p, contact_email: e.target.value }))
              }
            />
          </div>
          <Input
            type="textarea"
            label="Description"
            value={orgForm.description}
            onChange={(e) =>
              setOrgForm((p) => ({ ...p, description: e.target.value }))
            }
          />
          <Button
            variant="primary"
            fullWidth
            onClick={() => createOrgMutation.mutate()}
            loading={createOrgMutation.isPending}
            disabled={!orgForm.name.trim()}
          >
            Add Organisation
          </Button>
        </div>
      </Modal>

      {/* Create offer modal */}
      <Modal
        open={showCreateOffer}
        onClose={() => setShowCreateOffer(false)}
        title="Add Partner Offer"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Offer Title"
            value={offerForm.title}
            onChange={(e) =>
              setOfferForm((p) => ({ ...p, title: e.target.value }))
            }
            required
          />
          <Input
            type="textarea"
            label="Description"
            value={offerForm.description}
            onChange={(e) =>
              setOfferForm((p) => ({ ...p, description: e.target.value }))
            }
          />
          {organisations && organisations.length > 0 && (
            <Dropdown
              options={[
                { value: '', label: 'Select organisation...' },
                ...organisations.map((o) => ({ value: o.id, label: o.name })),
              ]}
              value={offerForm.organisation_id}
              onChange={(v) =>
                setOfferForm((p) => ({ ...p, organisation_id: v }))
              }
              label="Organisation"
            />
          )}
          <Input
            label="Category"
            value={offerForm.category}
            onChange={(e) =>
              setOfferForm((p) => ({ ...p, category: e.target.value }))
            }
            placeholder="e.g. Outdoor Gear, Food & Drink"
          />
          <Input
            type="textarea"
            label="Terms & Conditions"
            value={offerForm.terms}
            onChange={(e) =>
              setOfferForm((p) => ({ ...p, terms: e.target.value }))
            }
          />
          <Button
            variant="primary"
            fullWidth
            onClick={() => createOfferMutation.mutate()}
            loading={createOfferMutation.isPending}
            disabled={!offerForm.title.trim()}
          >
            Add Offer
          </Button>
        </div>
      </Modal>

      <ConfirmationSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete"
        description="This will permanently delete this item."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  )
}
